'use client';
import React, { useEffect, useState } from 'react';
import type { ProductBacklog, Analysis5W1H } from '@/lib/types';
import AIAssistant from './AIAssistant';
import { useToast } from './Toast';
import { diffLines, hasChanges } from '@/lib/text-diff';

interface BacklogHistory {
  id: number;
  version: string;
  user_story: string;
  acceptance_criteria: string;
  priority: string;
  cr_reason: string;
  cr_impact: string;
  changed_by: string;
  changed_at: string;
}

const PRIORITY_META = {
  'P0-Core':        { label: 'P0 — Core', color: 'bg-red-100 text-red-700 border-red-300', dot: 'bg-red-500' },
  'P1-High':        { label: 'P1 — High', color: 'bg-orange-100 text-orange-700 border-orange-300', dot: 'bg-orange-500' },
  'P2-NiceToHave':  { label: 'P2 — Nice', color: 'bg-gray-100 text-gray-600 border-gray-300', dot: 'bg-gray-400' },
};

const EMPTY_TASK = { user_story: '', acceptance_criteria: '', priority: 'P1-High', analysis_id: '', epic_group: '' };
const EMPTY_CR = { ...EMPTY_TASK, cr_reason: '', cr_impact: '', cr_manhours: '' };
const EMPTY_UNLOCK = { cr_reason: '', cr_impact: '', changed_by: '' };

const STATUS_OPTIONS = ['To Do', 'In Progress', 'Testing', 'Done'];

export default function BacklogTab({ projectId, isLocked, onRefresh }: { projectId: string; isLocked: boolean; onRefresh: () => void }) {
  const { success, error: toastError } = useToast();
  const [tasks, setTasks] = useState<ProductBacklog[]>([]);
  const [analyses, setAnalyses] = useState<Analysis5W1H[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showCRForm, setShowCRForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [taskForm, setTaskForm] = useState(EMPTY_TASK);
  const [crForm, setCRForm] = useState(EMPTY_CR);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterPriority, setFilterPriority] = useState('all');

  // Epic 2: Versioning — Unlock (Change Request) + History with diff
  const [unlockTaskId, setUnlockTaskId] = useState<number | null>(null);
  const [unlockForm, setUnlockForm] = useState(EMPTY_UNLOCK);
  const [historyTaskId, setHistoryTaskId] = useState<number | null>(null);
  const [history, setHistory] = useState<BacklogHistory[]>([]);

  const fetchData = async () => {
    const [t, a] = await Promise.all([
      fetch(`/api/projects/${projectId}/backlog`).then(r => r.json()),
      fetch(`/api/projects/${projectId}/analysis`).then(r => r.json()),
    ]);
    setTasks(t); setAnalyses(a);
  };

  useEffect(() => { fetchData(); }, [projectId]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const body = { ...taskForm, analysis_id: taskForm.analysis_id || null };
    const url = editId ? `/api/projects/${projectId}/backlog/${editId}` : `/api/projects/${projectId}/backlog`;
    const res = await fetch(url, { method: editId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) { toastError((await res.json()).error || 'Lưu thất bại'); setSubmitting(false); return; }
    success(editId ? 'Đã cập nhật User Story' : 'Đã thêm User Story');
    setTaskForm(EMPTY_TASK); setShowTaskForm(false); setEditId(null); setSubmitting(false);
    fetchData(); onRefresh();
  };

  const handleAddCR = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch(`/api/projects/${projectId}/backlog/change-request`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...crForm, analysis_id: crForm.analysis_id || null }),
    });
    if (!res.ok) { toastError((await res.json()).error || 'Gửi CR thất bại'); setSubmitting(false); return; }
    success('Đã gửi Change Request — chờ CEO duyệt');
    setCRForm(EMPTY_CR); setShowCRForm(false); setSubmitting(false);
    fetchData(); onRefresh();
  };

  const handleApproveCR = async (taskId: number, approved: boolean) => {
    await fetch(`/api/projects/${projectId}/backlog/${taskId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cr_approved: approved ? 1 : 0 }),
    });
    success(approved ? 'Đã duyệt Change Request' : 'Đã từ chối Change Request');
    fetchData();
  };

  const handleDelete = async (taskId: number) => {
    if (!confirm('Xóa task này?')) return;
    const res = await fetch(`/api/projects/${projectId}/backlog/${taskId}`, { method: 'DELETE' });
    if (!res.ok) { toastError((await res.json()).error || 'Xóa thất bại'); return; }
    success('Đã xóa User Story');
    fetchData(); onRefresh();
  };

  const handleEdit = (task: ProductBacklog) => {
    setTaskForm({ user_story: task.user_story, acceptance_criteria: task.acceptance_criteria, priority: task.priority, analysis_id: task.analysis_id?.toString() || '', epic_group: task.epic_group || '' });
    setEditId(task.id); setShowTaskForm(true);
  };

  const handleStatusChange = async (taskId: number, status: string) => {
    const res = await fetch(`/api/projects/${projectId}/backlog/${taskId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      success('Đã cập nhật trạng thái');
      fetchData();
    } else {
      toastError('Cập nhật thất bại');
    }
  };

  const handleFreezeEpic = async (epicGroup: string) => {
    if (!confirm(`Khóa (Freeze) toàn bộ Epic "${epicGroup}"?`)) return;
    const res = await fetch(`/api/projects/${projectId}/freeze`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ epic_group: epicGroup }),
    });
    if (res.ok) {
      success(`Đã khóa Epic ${epicGroup}`);
      fetchData();
    } else {
      toastError((await res.json()).error || 'Khóa Epic thất bại');
    }
  };

  const handleLock = async (taskId: number) => {
    const task = tasks.find(t => t.id === taskId);
    const currentVersion = (task as ProductBacklog & { version?: string })?.version || 'v1.0';
    await fetch(`/api/projects/${projectId}/backlog/${taskId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_locked: 1, version: currentVersion }),
    });
    success('Đã chốt (Lock) User Story');
    fetchData();
  };

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockTaskId) return;
    setSubmitting(true);
    const res = await fetch(`/api/projects/${projectId}/backlog/${unlockTaskId}/history`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(unlockForm),
    });
    if (!res.ok) { toastError((await res.json()).error || 'Mở khóa thất bại'); setSubmitting(false); return; }
    const data = await res.json();
    success(`Đã mở khóa — version mới ${data.version || ''}`);
    setUnlockTaskId(null); setUnlockForm(EMPTY_UNLOCK); setSubmitting(false);
    fetchData(); onRefresh();
  };

  const handleShowHistory = async (taskId: number) => {
    const rows = await fetch(`/api/projects/${projectId}/backlog/${taskId}/history`).then(r => r.json());
    setHistory(rows); setHistoryTaskId(taskId);
  };

  const normalTasks = tasks.filter(t => !t.is_change_request);
  const crTasks = tasks.filter(t => t.is_change_request);
  const filteredNormal = filterPriority === 'all' ? normalTasks : normalTasks.filter(t => t.priority === filterPriority);

  const groupedTasks = filteredNormal.reduce((acc, task) => {
    const group = task.epic_group || 'Chưa phân nhóm';
    if (!acc[group]) acc[group] = [];
    acc[group].push(task);
    return acc;
  }, {} as Record<string, ProductBacklog[]>);

  const stats = {
    p0: normalTasks.filter(t => t.priority === 'P0-Core').length,
    p1: normalTasks.filter(t => t.priority === 'P1-High').length,
    p2: normalTasks.filter(t => t.priority === 'P2-NiceToHave').length,
    crPending: crTasks.filter(t => !t.cr_approved).length,
    crApproved: crTasks.filter(t => t.cr_approved).length,
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Product Backlog</h2>
          <p className="text-sm text-gray-500 mt-1">
            Danh sách User Stories + Acceptance Criteria. Mỗi task phải liên kết đến phân tích 5W1H để đảm bảo traceability.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {!isLocked && (
            <button onClick={() => { setTaskForm(EMPTY_TASK); setEditId(null); setShowTaskForm(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">
              + Thêm User Story
            </button>
          )}
          {isLocked && (
            <button onClick={() => setShowCRForm(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5">
              🔄 Change Request
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        {[
          { label: 'P0 Core', value: stats.p0, color: 'bg-red-50 border-red-200 text-red-700' },
          { label: 'P1 High', value: stats.p1, color: 'bg-orange-50 border-orange-200 text-orange-700' },
          { label: 'P2 Nice', value: stats.p2, color: 'bg-gray-50 border-gray-200 text-gray-600' },
          { label: 'CR Chờ duyệt', value: stats.crPending, color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
          { label: 'CR Đã duyệt', value: stats.crApproved, color: 'bg-green-50 border-green-200 text-green-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-3 ${s.color}`}>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs font-semibold mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {isLocked && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2 text-sm text-red-700">
          <span className="text-base">🔒</span>
          <span>Backlog đã <strong>Freeze</strong>. Mọi task mới phải đi qua <strong>Change Request</strong> và được CEO duyệt trước khi Dev thực hiện.</span>
        </div>
      )}

      {/* Filter */}
      {normalTasks.length > 0 && (
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
          {[['all', 'Tất cả', normalTasks.length], ['P0-Core', 'P0 Core', stats.p0], ['P1-High', 'P1 High', stats.p1], ['P2-NiceToHave', 'P2 Nice', stats.p2]].map(([key, label, cnt]) => (
            <button key={key} onClick={() => setFilterPriority(key as string)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md ${filterPriority === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {label} ({cnt})
            </button>
          ))}
        </div>
      )}

      {/* Task table */}
      {filteredNormal.length === 0 && crTasks.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">📌</div>
          <p className="font-semibold text-gray-600 mb-1">Chưa có User Story nào</p>
          <p className="text-gray-400 text-sm mb-4">Thêm từ kết quả phân tích 5W1H. Mỗi task phải có AC rõ ràng.</p>
          {!isLocked && analyses.length > 0 && <button onClick={() => { setTaskForm(EMPTY_TASK); setEditId(null); setShowTaskForm(true); }} className="bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg text-sm">Thêm User Story đầu tiên</button>}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold w-8">#</th>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold">User Story</th>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold w-24">Priority</th>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold w-36">Nguồn (5W1H)</th>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold w-32">Status (Dev)</th>
                <th className="w-24 px-4 py-3"></th>
              </tr>
            </thead>
            {Object.entries(groupedTasks).map(([epic, epicTasks]) => (
              <tbody key={epic}>
                <tr className="bg-slate-100 border-b border-gray-200">
                  <td colSpan={6} className="px-4 py-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded uppercase tracking-wide">Epic</span>
                        {epic}
                        <span className="text-xs text-slate-500 font-normal ml-2">({epicTasks.length} stories)</span>
                      </div>
                      {!isLocked && epic !== 'Chưa phân nhóm' && (
                        <button onClick={() => handleFreezeEpic(epic)}
                          className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-2 py-1 rounded shadow-sm">
                          🔒 Khóa Epic
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {epicTasks.map(task => {
                  const pm = PRIORITY_META[task.priority as keyof typeof PRIORITY_META] || PRIORITY_META['P1-High'];
                  const linkedAnalysis = analyses.find(a => a.id === task.analysis_id);
                  const isExpanded = expandedId === task.id;
                  return (
                    <React.Fragment key={task.id}>
                      <tr className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${task.is_locked ? 'opacity-75' : ''}`}
                        onClick={() => setExpandedId(isExpanded ? null : task.id)}>
                        <td className="px-4 py-3 text-gray-400 font-semibold">{task.id}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800 italic line-clamp-2">{task.user_story}</div>
                          <div className="flex items-center gap-2 mt-1">
                            {linkedAnalysis && <div className="text-xs text-blue-500">→ {linkedAnalysis.business_flow}</div>}
                            {(task as ProductBacklog & { version?: string }).version && (
                              <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-mono font-semibold">
                                {(task as ProductBacklog & { version?: string }).version}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs border px-2 py-0.5 rounded-full font-semibold ${pm.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${pm.dot}`}></span>{pm.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {linkedAnalysis ? (
                            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium truncate block max-w-[130px]">{linkedAnalysis.business_flow}</span>
                          ) : <span className="text-gray-300 text-xs">Không liên kết</span>}
                        </td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          {task.is_locked ? (
                            <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-semibold inline-flex flex-col gap-1">
                              <span>🔒 Đã chốt</span>
                              <span className="text-[10px] uppercase font-bold text-slate-500 bg-white px-1 rounded">{task.status || 'To Do'}</span>
                            </span>
                          ) : (
                            <select value={task.status || 'To Do'} onChange={e => handleStatusChange(task.id, e.target.value)}
                              className={`text-xs font-semibold px-2 py-1 rounded border outline-none cursor-pointer ${
                                task.status === 'Done' ? 'bg-green-100 text-green-700 border-green-200' :
                                task.status === 'Testing' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                task.status === 'In Progress' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                'bg-gray-100 text-gray-700 border-gray-200'
                              }`}>
                              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
                            {!task.is_locked ? (
                              <>
                                <button onClick={() => handleEdit(task)} className="text-blue-400 hover:text-blue-600 p-1" title="Sửa">✏️</button>
                                <button onClick={() => handleLock(task.id)} className="text-gray-400 hover:text-amber-600 p-1" title="Chốt (Lock)">🔒</button>
                                <button onClick={() => handleDelete(task.id)} className="text-gray-300 hover:text-red-400 p-1" title="Xóa">🗑️</button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => { setUnlockTaskId(task.id); setUnlockForm(EMPTY_UNLOCK); }} className="text-amber-500 hover:text-amber-700 p-1 text-xs font-semibold border border-amber-300 rounded px-1.5" title="Mở khóa (CR)">🔓 Unlock</button>
                              </>
                            )}
                            <button onClick={() => handleShowHistory(task.id)} className="text-gray-300 hover:text-purple-500 p-1" title="Lịch sử thay đổi">📜</button>
                            <span className="text-gray-300 p-1">{isExpanded ? '▲' : '▼'}</span>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${task.id}-exp`} className="bg-blue-50/30 border-b border-gray-100">
                          <td></td>
                          <td colSpan={5} className="px-4 py-4">
                            <div className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-2">✅ Acceptance Criteria</div>
                            {task.acceptance_criteria ? (
                              <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">{task.acceptance_criteria}</div>
                            ) : <div className="text-gray-400 text-sm italic">Chưa có Acceptance Criteria</div>}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            ))}
          </table>
        </div>
      )}

      {/* Change Requests section */}
      {crTasks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-bold text-gray-800">🔄 Change Requests</h3>
            <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full font-semibold">{stats.crPending} chờ duyệt</span>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {crTasks.map(task => {
              const pm = PRIORITY_META[task.priority as keyof typeof PRIORITY_META] || PRIORITY_META['P1-High'];
              return (
                <div key={task.id} className={`border-b border-gray-100 last:border-0 p-4 ${task.cr_approved ? 'bg-green-50/30' : 'bg-orange-50/30'}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs border px-2 py-0.5 rounded-full font-semibold ${pm.color}`}>{pm.label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${task.cr_approved ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {task.cr_approved ? '✅ Đã duyệt' : '⏳ Chờ CEO duyệt'}
                        </span>
                      </div>
                      <div className="font-medium text-gray-800 italic mb-3">{task.user_story}</div>
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div className="bg-white border border-gray-200 rounded-lg p-2">
                          <div className="font-semibold text-gray-500 mb-0.5">Lý do yêu cầu</div>
                          <div className="text-gray-700">{task.cr_reason}</div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-lg p-2">
                          <div className="font-semibold text-gray-500 mb-0.5">Tác động code cũ</div>
                          <div className="text-gray-700">{task.cr_impact}</div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-lg p-2">
                          <div className="font-semibold text-gray-500 mb-0.5">Man-hours dự kiến</div>
                          <div className="font-bold text-gray-900 text-sm">{task.cr_manhours}h</div>
                        </div>
                      </div>
                      {task.acceptance_criteria && (
                        <div className="mt-2 text-xs text-gray-500 bg-white border border-gray-200 rounded-lg p-2">
                          <span className="font-semibold">AC: </span>{task.acceptance_criteria}
                        </div>
                      )}
                    </div>
                    {!task.cr_approved && (
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => handleApproveCR(task.id, true)}
                          className="bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">✓ Duyệt</button>
                        <button onClick={() => handleApproveCR(task.id, false)}
                          className="bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold px-3 py-1.5 rounded-lg">✗ Từ chối</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showTaskForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto" onClick={e => e.target === e.currentTarget && setShowTaskForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">{editId ? 'Chỉnh sửa' : 'Thêm'} User Story</h2>
                <p className="text-xs text-gray-400 mt-0.5">Cấu trúc: &quot;Là [x], tôi muốn [y], để [z]&quot;</p>
              </div>
              <button onClick={() => setShowTaskForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>

            <form onSubmit={handleAddTask} className="p-6 space-y-4">
              {/* Link to analysis */}
              {analyses.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Liên kết phân tích 5W1H (Traceability)</label>
                  <select value={taskForm.analysis_id} onChange={e => setTaskForm(f => ({ ...f, analysis_id: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">— Không liên kết —</option>
                    {analyses.map(a => <option key={a.id} value={a.id}>{a.business_flow}</option>)}
                  </select>
                  {taskForm.analysis_id && (
                    <div className="mt-1.5 text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-2 py-1.5">
                      {(() => {
                        const a = analyses.find(x => x.id === parseInt(taskForm.analysis_id));
                        return a ? `Who: ${a.who} · Why: ${a.why?.slice(0, 60)}${a.why?.length > 60 ? '...' : ''}` : '';
                      })()}
                    </div>
                  )}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-gray-700">User Story <span className="text-red-500">*</span></label>
                  {taskForm.analysis_id && (() => {
                    const a = analyses.find(x => x.id === parseInt(taskForm.analysis_id));
                    return a ? (
                      <AIAssistant
                        task="backlog_story"
                        context={{ business_flow: a.business_flow, who: a.who, what: a.what, why: a.why, when: a.when_field, where: a.where_field, how: a.how_edge_cases }}
                        label="✨ AI viết User Story + AC"
                        hint="AI sẽ viết User Story và Acceptance Criteria từ phân tích 5W1H"
                        onResult={(result) => {
                          const r = result as { user_story?: string; acceptance_criteria?: string };
                          if (r.user_story) setTaskForm(f => ({ ...f, user_story: r.user_story || f.user_story }));
                          if (r.acceptance_criteria) setTaskForm(f => ({ ...f, acceptance_criteria: r.acceptance_criteria || f.acceptance_criteria }));
                        }}
                      />
                    ) : null;
                  })()}
                </div>
                <textarea value={taskForm.user_story} onChange={e => setTaskForm(f => ({ ...f, user_story: e.target.value }))}
                  placeholder={'Là [Nhân viên Thu mua], tôi muốn [hệ thống tự so sánh báo giá từ 3 NCC], để [không phải nhìn chéo 3 file Excel].'}
                  rows={3} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Acceptance Criteria (Tiêu chí nghiệm thu)</label>
                <div className="text-xs text-gray-400 mb-1.5">Dev code xong phải đáp ứng đủ các điều kiện này mới được tính là Done</div>
                <textarea value={taskForm.acceptance_criteria} onChange={e => setTaskForm(f => ({ ...f, acceptance_criteria: e.target.value }))}
                  placeholder={'- Highlight màu xanh cho báo giá rẻ nhất\n- Cột giá sort tự động từ thấp đến cao\n- Nếu chỉ 1 NCC → hiển thị cảnh báo màu vàng\n- Export được ra PDF để trình ký'}
                  rows={5}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 resize-none font-mono text-xs" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Epic Group</label>
                  <input type="text" value={taskForm.epic_group} onChange={e => setTaskForm(f => ({ ...f, epic_group: e.target.value }))}
                    placeholder="VD: Quản lý Người dùng"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Priority</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.entries(PRIORITY_META) as [string, typeof PRIORITY_META[keyof typeof PRIORITY_META]][]).map(([key, meta]) => (
                      <button key={key} type="button" onClick={() => setTaskForm(f => ({ ...f, priority: key }))}
                        className={`py-1 rounded-lg border-2 text-sm font-semibold transition-colors ${taskForm.priority === key ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                        <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] border ${meta.color}`}>{meta.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowTaskForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">Hủy</button>
                <button type="submit" disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-bold disabled:opacity-50">
                  {submitting ? 'Đang lưu...' : editId ? '💾 Cập nhật' : '💾 Thêm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Request Modal */}
      {showCRForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto" onClick={e => e.target === e.currentTarget && setShowCRForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">🔄 Tạo Change Request</h2>
                <p className="text-xs text-gray-400 mt-0.5">Yêu cầu này sẽ chờ CEO duyệt trước khi Dev thực hiện</p>
              </div>
              <button onClick={() => setShowCRForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>

            <form onSubmit={handleAddCR} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">User Story <span className="text-red-500">*</span></label>
                <textarea value={crForm.user_story} onChange={e => setCRForm(f => ({ ...f, user_story: e.target.value }))}
                  placeholder="Là [...], tôi muốn [...], để [...]" rows={2} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Acceptance Criteria</label>
                <textarea value={crForm.acceptance_criteria} onChange={e => setCRForm(f => ({ ...f, acceptance_criteria: e.target.value }))}
                  rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 resize-none font-mono text-xs"
                  placeholder="- Điều kiện 1&#10;- Điều kiện 2" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Priority</label>
                <select value={crForm.priority} onChange={e => setCRForm(f => ({ ...f, priority: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="P0-Core">P0 — Core (urgent)</option>
                  <option value="P1-High">P1 — High</option>
                  <option value="P2-NiceToHave">P2 — Nice to have</option>
                </select>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
                <div className="text-xs font-bold text-orange-700 uppercase tracking-wide">Thông tin bắt buộc cho Change Request</div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Lý do yêu cầu thay đổi <span className="text-red-500">*</span></label>
                  <textarea value={crForm.cr_reason} onChange={e => setCRForm(f => ({ ...f, cr_reason: e.target.value }))}
                    placeholder="Tại sao cần tính năng này? Business context là gì? Ai yêu cầu?" rows={2} required
                    className="w-full border border-orange-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Tác động đến code hiện tại (Impact) <span className="text-red-500">*</span></label>
                  <textarea value={crForm.cr_impact} onChange={e => setCRForm(f => ({ ...f, cr_impact: e.target.value }))}
                    placeholder="Ảnh hưởng đến module nào? Cần refactor gì? Rủi ro regression?" rows={2} required
                    className="w-full border border-orange-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Ước tính thời gian thực hiện (Man-hours) <span className="text-red-500">*</span></label>
                  <input type="number" min="0.5" step="0.5" value={crForm.cr_manhours} onChange={e => setCRForm(f => ({ ...f, cr_manhours: e.target.value }))}
                    placeholder="VD: 8" required
                    className="w-full border border-orange-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400" />
                </div>
              </div>

              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowCRForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">Hủy</button>
                <button type="submit" disabled={submitting}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-lg text-sm font-bold disabled:opacity-50">
                  {submitting ? 'Đang gửi...' : '🔄 Gửi Change Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unlock (CR) Modal */}
      {unlockTaskId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setUnlockTaskId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-amber-100 bg-amber-50 rounded-t-2xl">
              <div>
                <h2 className="font-bold text-amber-900">🔓 Mở khóa — Tạo Change Request</h2>
                <p className="text-xs text-amber-700 mt-0.5">Nội dung cũ sẽ được lưu vào lịch sử. Version sẽ được tăng lên.</p>
              </div>
              <button onClick={() => setUnlockTaskId(null)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <form onSubmit={handleUnlockSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Lý do thay đổi (CR Reason) <span className="text-red-500">*</span></label>
                <textarea value={unlockForm.cr_reason} onChange={e => setUnlockForm(f => ({ ...f, cr_reason: e.target.value }))}
                  placeholder="VD: Khách hàng yêu cầu bổ sung tính năng lọc theo ngày tháng..."
                  rows={3} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none resize-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mức độ ảnh hưởng (Impact Analysis)</label>
                <textarea value={unlockForm.cr_impact} onChange={e => setUnlockForm(f => ({ ...f, cr_impact: e.target.value }))}
                  placeholder="VD: Ảnh hưởng đến module Báo cáo, cần thêm ~8h dev..."
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none resize-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Người thực hiện</label>
                <input value={unlockForm.changed_by} onChange={e => setUnlockForm(f => ({ ...f, changed_by: e.target.value }))}
                  placeholder="Tên BA / PM..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none" />
              </div>
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setUnlockTaskId(null)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">Hủy</button>
                <button type="submit" disabled={submitting}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-lg text-sm font-bold disabled:opacity-50">
                  {submitting ? 'Đang xử lý...' : '✅ Xác nhận & Mở khóa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyTaskId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setHistoryTaskId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">📜 Lịch sử thay đổi — Task #{historyTaskId}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Các phiên bản trước khi bị unlock và chỉnh sửa</p>
              </div>
              <button onClick={() => setHistoryTaskId(null)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <div className="overflow-y-auto flex-1 p-5">
              {history.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-3xl mb-2">📭</div>
                  <p>Chưa có lịch sử thay đổi nào</p>
                  <p className="text-xs mt-1">Khi task được Unlock, phiên bản cũ sẽ được lưu tại đây</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const liveTask = tasks.find(t => t.id === historyTaskId);
                    // history is DESC (newest snapshot first). The version that replaced
                    // history[i] is history[i-1], or the live task for the newest snapshot.
                    return history.map((h, i) => {
                      const newerStory = i === 0 ? (liveTask?.user_story || '') : history[i - 1].user_story;
                      const newerAC = i === 0 ? (liveTask?.acceptance_criteria || '') : history[i - 1].acceptance_criteria;
                      const newerVersion = i === 0 ? ((liveTask as ProductBacklog & { version?: string })?.version || 'hiện tại') : history[i - 1].version;
                      const storyDiff = diffLines(h.user_story, newerStory);
                      const acDiff = diffLines(h.acceptance_criteria || '', newerAC || '');
                      return (
                        <div key={h.id} className="border border-amber-200 rounded-xl p-4 bg-amber-50/40">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-sm font-bold text-amber-700 font-mono bg-amber-100 border border-amber-200 px-2 py-0.5 rounded">{h.version}</span>
                            <span className="text-gray-400 text-xs">→</span>
                            <span className="text-sm font-bold text-green-700 font-mono bg-green-100 border border-green-200 px-2 py-0.5 rounded">{newerVersion}</span>
                            <span className="text-xs text-gray-500 ml-1">{h.changed_at}</span>
                            {h.changed_by && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{h.changed_by}</span>}
                          </div>
                          <div className="bg-amber-100/60 border border-amber-200 rounded-lg px-3 py-2 mb-2">
                            <div className="text-xs font-semibold text-amber-800 mb-1">Lý do thay đổi:</div>
                            <div className="text-sm text-gray-700">{h.cr_reason}</div>
                            {h.cr_impact && <div className="text-xs text-gray-500 mt-1">Impact: {h.cr_impact}</div>}
                          </div>
                          <div className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide flex items-center gap-2">
                            User Story
                            {hasChanges(storyDiff) && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded normal-case">đã thay đổi</span>}
                          </div>
                          <DiffBlock segments={storyDiff} unchangedFallback={h.user_story} />
                          {(h.acceptance_criteria || newerAC) && (
                            <>
                              <div className="text-xs font-semibold text-gray-500 mb-1 mt-2 uppercase tracking-wide">Acceptance Criteria</div>
                              <DiffBlock segments={acDiff} unchangedFallback={h.acceptance_criteria} mono />
                            </>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DiffBlock({ segments, unchangedFallback, mono }: { segments: import('@/lib/text-diff').DiffSegment[]; unchangedFallback: string; mono?: boolean }) {
  const changed = segments.some(s => s.type !== 'same');
  if (!changed) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 ${mono ? 'font-mono text-xs whitespace-pre-wrap' : 'italic'}`}>
        {unchangedFallback || <span className="text-gray-300">(trống)</span>}
        <span className="ml-2 text-[10px] text-gray-400">— không đổi</span>
      </div>
    );
  }
  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${mono ? 'font-mono text-xs' : 'text-sm'}`}>
      {segments.map((s, i) => (
        <div key={i}
          className={`px-3 py-0.5 flex gap-2 ${
            s.type === 'add' ? 'bg-green-50 text-green-800' :
            s.type === 'del' ? 'bg-red-50 text-red-700 line-through decoration-red-300' :
            'text-gray-600'
          }`}>
          <span className={`select-none w-3 shrink-0 ${s.type === 'add' ? 'text-green-500' : s.type === 'del' ? 'text-red-400' : 'text-gray-300'}`}>
            {s.type === 'add' ? '+' : s.type === 'del' ? '−' : ''}
          </span>
          <span className="whitespace-pre-wrap break-words">{s.text || ' '}</span>
        </div>
      ))}
    </div>
  );
}

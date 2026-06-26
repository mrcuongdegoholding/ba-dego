'use client';
import { useEffect, useState } from 'react';
import type { SurveyStep1, SurveyStep3 } from '@/lib/types';
import AIAssistant from './AIAssistant';
import { useToast } from './Toast';

type ActionType = 'redundant' | 'hidden' | 'manual' | 'workaround' | 'communication';
type AutoPotential = 'high' | 'medium' | 'low';

const ACTION_META: Record<ActionType, { label: string; color: string; icon: string }> = {
  redundant:     { label: 'Thao tác thừa',    color: 'bg-red-50 text-red-700 border-red-200',     icon: '🔴' },
  hidden:        { label: 'Bước ngầm định',   color: 'bg-orange-50 text-orange-700 border-orange-200', icon: '🟠' },
  manual:        { label: 'Thủ công hóa',     color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: '🟡' },
  workaround:    { label: 'Giải pháp tạm',    color: 'bg-purple-50 text-purple-700 border-purple-200', icon: '🟣' },
  communication: { label: 'Giao tiếp ngoài luồng', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: '🔵' },
};

const AUTO_META: Record<AutoPotential, { label: string; color: string }> = {
  high:   { label: 'Cao — Nên tự động hóa', color: 'bg-green-100 text-green-700' },
  medium: { label: 'Trung bình', color: 'bg-yellow-100 text-yellow-700' },
  low:    { label: 'Thấp — Cần con người', color: 'bg-gray-100 text-gray-600' },
};

export default function Step3Tab({ projectId, isLocked, onRefresh }: { projectId: string; isLocked: boolean; onRefresh: () => void }) {
  const { error: toastError } = useToast();
  const [entries, setEntries] = useState<SurveyStep3[]>([]);
  const [step1s, setStep1s] = useState<SurveyStep1[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    observation: '', action_type: 'redundant' as ActionType, duration_minutes: '',
    frequency: '', automation_potential: 'medium' as AutoPotential,
    is_pain_point: false, hidden_requirement: '', step1_id: '', created_by: 'Giang (BA)',
  });
  const [submitting, setSubmitting] = useState(false);
  const [filterType, setFilterType] = useState('all');

  const fetchData = async () => {
    const [s3, s1] = await Promise.all([
      fetch(`/api/projects/${projectId}/survey/step3`).then(r => r.json()),
      fetch(`/api/projects/${projectId}/survey/step1`).then(r => r.json()),
    ]);
    setEntries(s3); setStep1s(s1);
  };

  useEffect(() => { fetchData(); }, [projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch(`/api/projects/${projectId}/survey/step3`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, duration_minutes: parseInt(form.duration_minutes as string) || 0, step1_id: form.step1_id || null }),
    });
    if (!res.ok) { toastError((await res.json()).error || 'Lưu thất bại'); setSubmitting(false); return; }
    setForm({ observation: '', action_type: 'redundant', duration_minutes: '', frequency: '', automation_potential: 'medium', is_pain_point: false, hidden_requirement: '', step1_id: '', created_by: 'Giang (BA)' });
    setShowForm(false); setSubmitting(false);
    fetchData(); onRefresh();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xóa quan sát này?')) return;
    await fetch(`/api/projects/${projectId}/survey/step3/${id}`, { method: 'DELETE' });
    fetchData(); onRefresh();
  };

  const totalMinutes = entries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
  const highAutomation = entries.filter(e => e.automation_potential === 'high').length;
  const filtered = filterType === 'all' ? entries : entries.filter(e => e.action_type === filterType);

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Bước 3: Quan sát thực tế (Shadowing)</h2>
          <p className="text-sm text-gray-500 mt-1">
            <strong>BA/Dev ngồi cạnh User</strong>, tự tay thao tác hoặc quan sát. Ghi lại <strong>thao tác thừa</strong> và <strong>bước ngầm định</strong> User quên kể.
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2 w-fit">
            ⭐ <strong>Bước quan trọng nhất</strong> theo chỉ đạo CEO — Tận dụng lợi thế &quot;người nhà&quot;
          </div>
        </div>
        {!isLocked && (
          <div className="flex items-center gap-2 shrink-0">
            <AIAssistant
              task="step3_observations"
              context={{
                process_name: step1s[0]?.process_name || 'quy trình',
                department: step1s[0]?.department || '',
                steps: step1s[0] ? JSON.parse(step1s[0].process_steps || '[]').map((s: { step: string }) => s.step).join('; ') : '',
                pain_points: step1s[0] ? JSON.parse(step1s[0].pain_points || '[]').join('; ') : '',
              }}
              label="AI gợi ý quan sát"
              hint="AI gợi ý danh sách hành động cần quan sát khi shadowing"
              onResult={(result) => {
                if (Array.isArray(result)) {
                  const items = result as { observation: string; action_type: string; automation_potential: string }[];
                  Promise.all(items.map(item =>
                    fetch(`/api/projects/${projectId}/survey/step3`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ observation: item.observation, action_type: item.action_type, automation_potential: item.automation_potential, duration_minutes: 0, frequency: '', is_pain_point: false, step1_id: step1s[0]?.id || null }),
                    })
                  )).then(() => { fetchData(); onRefresh(); });
                }
              }}
            />
            <button onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">
              + Thêm quan sát
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      {entries.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <div className="text-2xl font-bold text-gray-900">{entries.length}</div>
            <div className="text-xs text-gray-500 font-semibold">Quan sát</div>
          </div>
          <div className="bg-red-50 rounded-xl border border-red-200 p-3">
            <div className="text-2xl font-bold text-red-700">{entries.filter(e => e.is_pain_point).length}</div>
            <div className="text-xs text-red-600 font-semibold">Pain Points</div>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-200 p-3">
            <div className="text-2xl font-bold text-green-700">{highAutomation}</div>
            <div className="text-xs text-green-600 font-semibold">Tự động hóa cao</div>
          </div>
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-3">
            <div className="text-2xl font-bold text-blue-700">{totalMinutes}</div>
            <div className="text-xs text-blue-600 font-semibold">Phút lãng phí / lần</div>
          </div>
        </div>
      )}

      {/* Filter */}
      {entries.length > 0 && (
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
          <button onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md ${filterType === 'all' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
            Tất cả ({entries.length})
          </button>
          {(Object.entries(ACTION_META) as [ActionType, typeof ACTION_META[ActionType]][]).map(([key, meta]) => {
            const cnt = entries.filter(e => e.action_type === key).length;
            if (!cnt) return null;
            return (
              <button key={key} onClick={() => setFilterType(key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md ${filterType === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
                {meta.icon} {meta.label} ({cnt})
              </button>
            );
          })}
        </div>
      )}

      {entries.length === 0 && !showForm && (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">👁️</div>
          <p className="font-semibold text-gray-600 mb-1">Chưa có quan sát nào</p>
          <p className="text-gray-400 text-sm mb-4">Ngồi cạnh User, ghi lại từng thao tác thủ công và bước ngầm định</p>
          {!isLocked && <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg text-sm">Thêm quan sát đầu tiên</button>}
        </div>
      )}

      {/* Observations table */}
      {filtered.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold">Quan sát / Mô tả</th>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold w-36">Phân loại</th>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold w-24">Thời gian</th>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold w-32">Tự động hóa</th>
                <th className="text-left px-4 py-3 text-gray-500 font-semibold w-32">Yêu cầu ẩn</th>
                <th className="w-16"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(entry => {
                const actionMeta = ACTION_META[entry.action_type as ActionType] || ACTION_META.redundant;
                const autoMeta = AUTO_META[entry.automation_potential as AutoPotential] || AUTO_META.medium;
                const linkedStep1 = step1s.find(s => s.id === entry.step1_id);
                return (
                  <tr key={entry.id} className={`border-b border-gray-100 last:border-0 ${entry.is_pain_point ? 'bg-red-50/40' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{entry.observation}</div>
                      {linkedStep1 && <div className="text-xs text-blue-500 mt-0.5">↑ {linkedStep1.process_name}</div>}
                      {entry.is_pain_point && <span className="text-xs text-red-500 font-semibold">🔴 Pain Point</span>}
                      <div className="text-xs text-gray-400 mt-0.5">{entry.created_by} · {entry.frequency}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs border px-2 py-1 rounded-full font-semibold whitespace-nowrap ${actionMeta.color}`}>
                        {actionMeta.icon} {actionMeta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {entry.duration_minutes > 0 ? (
                        <span className="font-semibold text-orange-600">{entry.duration_minutes} phút</span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${autoMeta.color}`}>{autoMeta.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      {entry.hidden_requirement ? (
                        <span className="text-xs text-orange-700 bg-orange-50 border border-orange-100 rounded px-2 py-1 block">{entry.hidden_requirement}</span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {!isLocked && <button onClick={() => handleDelete(entry.id)} className="text-gray-300 hover:text-red-400">🗑️</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">Thêm Quan sát (Shadowing)</h2>
                <p className="text-xs text-gray-400 mt-0.5">Ghi lại thao tác, bước ngầm định và cơ hội tự động hóa</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Action type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Loại quan sát</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {(Object.entries(ACTION_META) as [ActionType, typeof ACTION_META[ActionType]][]).map(([key, meta]) => (
                    <button key={key} type="button" onClick={() => setForm(f => ({ ...f, action_type: key }))}
                      className={`text-left px-3 py-2 rounded-lg border-2 transition-colors ${form.action_type === key ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <span className={`text-xs border px-1.5 py-0.5 rounded-full font-semibold ${meta.color}`}>{meta.icon} {meta.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {step1s.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Liên quan đến quy trình (Bước 1)</label>
                  <select value={form.step1_id} onChange={e => setForm(f => ({ ...f, step1_id: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">— Không chọn —</option>
                    {step1s.map(s => <option key={s.id} value={s.id}>{s.process_name} ({s.department})</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mô tả quan sát <span className="text-red-500">*</span></label>
                <textarea value={form.observation} onChange={e => setForm(f => ({ ...f, observation: e.target.value }))}
                  placeholder="VD: User phải copy dữ liệu từ file Báo giá NCC A, paste vào file Tổng hợp, rồi làm lại cho NCC B và C — 3 lần copy/paste thủ công"
                  rows={3} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Thời gian tốn cho thao tác này (~phút)</label>
                  <input type="number" min="0" value={form.duration_minutes}
                    onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
                    placeholder="VD: 15"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tần suất xảy ra</label>
                  <input value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                    placeholder="VD: Mỗi lần tạo PO, ~5 lần/ngày"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tiềm năng tự động hóa</label>
                <div className="flex gap-2">
                  {(Object.entries(AUTO_META) as [AutoPotential, typeof AUTO_META[AutoPotential]][]).map(([key, meta]) => (
                    <button key={key} type="button" onClick={() => setForm(f => ({ ...f, automation_potential: key }))}
                      className={`flex-1 py-2 rounded-lg border-2 text-xs font-semibold transition-colors ${form.automation_potential === key ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                      <span className={`inline-block px-2 py-0.5 rounded-full mb-0.5 ${meta.color}`}>{meta.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Yêu cầu ẩn phát hiện được (nếu có)</label>
                <input value={form.hidden_requirement} onChange={e => setForm(f => ({ ...f, hidden_requirement: e.target.value }))}
                  placeholder="VD: User tự tạo bảng theo dõi riêng bằng Excel → cần module tracking trong hệ thống"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_pain_point} onChange={e => setForm(f => ({ ...f, is_pain_point: e.target.checked }))}
                    className="w-4 h-4 accent-red-500" />
                  <span className="text-sm font-semibold text-red-700">🔴 Đây là Pain Point cần giải quyết</span>
                </label>
                <select value={form.created_by} onChange={e => setForm(f => ({ ...f, created_by: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 bg-white">
                  <option>Giang (BA)</option><option>Cường (Tech Lead)</option>
                  <option>Bảo (Dev)</option><option>Phú (PM)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">Hủy</button>
                <button type="submit" disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-bold disabled:opacity-50">
                  {submitting ? 'Đang lưu...' : '💾 Lưu Quan sát'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

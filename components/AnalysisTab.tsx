'use client';
import { useEffect, useState } from 'react';
import type { Analysis5W1H, SurveyStep1, SurveyStep2, SurveyStep3 } from '@/lib/types';
import AIAssistant from './AIAssistant';
import { useToast } from './Toast';
import dynamic from 'next/dynamic';
const MermaidDiagram = dynamic(() => import('./MermaidDiagram'), { ssr: false });

function sanitizeMermaid(text: string) {
  return (text || '').replace(/["\[\]{}()]/g, '').replace(/\n/g, ' ').slice(0, 60);
}

function build5W1HChart(title: string, who: string, what: string, where: string, when: string, how: string): string {
  const lines = ['flowchart TD'];
  // No emoji — Mermaid node labels must be plain text to render reliably.
  lines.push(`  START(["${sanitizeMermaid(title)}"])`);
  const nodes = [
    { id: 'WHO', label: sanitizeMermaid(who), tag: 'Who' },
    { id: 'WHAT', label: sanitizeMermaid(what), tag: 'What' },
    { id: 'WHERE', label: sanitizeMermaid(where), tag: 'Where' },
    { id: 'WHEN', label: sanitizeMermaid(when), tag: 'When' }
  ];
  nodes.forEach(n => {
    if (n.label) lines.push(`  ${n.id}["${n.tag}: ${n.label}"]`);
  });
  if (how) lines.push(`  HOW{"Edge Cases: ${sanitizeMermaid(how)}"}`);
  
  const activeNodes = nodes.filter(n => n.label).map(n => n.id);
  if (activeNodes.length > 0) {
    lines.push(`  START --> ${activeNodes[0]}`);
    for (let i = 0; i < activeNodes.length - 1; i++) {
      lines.push(`  ${activeNodes[i]} --> ${activeNodes[i+1]}`);
    }
    if (how) {
      lines.push(`  ${activeNodes[activeNodes.length - 1]} --> HOW`);
    }
  } else if (how) {
    lines.push(`  START --> HOW`);
  }
  return lines.join('\n');
}

const W_FIELDS = [
  { key: 'what',        label: 'What',              emoji: '❓', placeholder: 'Cần làm gì? Hệ thống hỗ trợ tác vụ nào?',       hint: 'Mô tả chức năng / tính năng cần xây dựng' },
  { key: 'who',         label: 'Who',               emoji: '👤', placeholder: 'Ai thực hiện? Ai phê duyệt? Ai bị ảnh hưởng?',  hint: 'Xác định vai trò và quyền hạn trong hệ thống' },
  { key: 'where_field', label: 'Where',             emoji: '📍', placeholder: 'Diễn ra ở đâu? Module nào? Màn hình nào?',       hint: 'Phạm vi trong hệ thống, tích hợp với module nào' },
  { key: 'when_field',  label: 'When',              emoji: '⏰', placeholder: 'Khi nào xảy ra? Trigger là gì? Tần suất?',       hint: 'Điều kiện kích hoạt tính năng, timeline' },
  { key: 'why',         label: 'Why',               emoji: '💡', placeholder: 'Tại sao cần tính năng này? Giải quyết pain point gì?', hint: 'Liên kết đến Pain Point từ khảo sát' },
  { key: 'how_edge_cases', label: 'How / Edge Cases', emoji: '⚠️', placeholder: 'Ngoại lệ: Nếu X thì Y... (BẮT BUỘC điền)', hint: 'REQUIRED: Các trường hợp đặc biệt, lỗi, exception' },
];

interface SurveyData { step1: SurveyStep1[]; step2: SurveyStep2[]; step3: SurveyStep3[] }

export default function AnalysisTab({ projectId, isLocked, onRefresh }: { projectId: string; isLocked: boolean; onRefresh: () => void }) {
  const { error: toastError } = useToast();
  const [rows, setRows] = useState<Analysis5W1H[]>([]);
  const [survey, setSurvey] = useState<SurveyData>({ step1: [], step2: [], step3: [] });
  const [showForm, setShowForm] = useState(false);
  const [diagramIds, setDiagramIds] = useState<Set<number>>(new Set());
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ business_flow: '', what: '', who: '', where_field: '', when_field: '', why: '', how_edge_cases: '', source_step1_ids: [] as number[], source_step2_ids: [] as number[], source_step3_ids: [] as number[] });
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [sourceTab, setSourceTab] = useState<'step1' | 'step2' | 'step3'>('step1');

  const fetchData = async () => {
    const [a, s] = await Promise.all([
      fetch(`/api/projects/${projectId}/analysis`).then(r => r.json()),
      fetch(`/api/projects/${projectId}/survey/summary`).then(r => r.json()),
    ]);
    setRows(a); setSurvey(s);
  };

  useEffect(() => { fetchData(); }, [projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const url = editId ? `/api/projects/${projectId}/analysis/${editId}` : `/api/projects/${projectId}/analysis`;
    const res = await fetch(url, {
      method: editId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!res.ok) { toastError((await res.json()).error || 'Lưu thất bại'); setSubmitting(false); return; }
    resetForm();
    setSubmitting(false);
    fetchData(); onRefresh();
  };

  const resetForm = () => {
    setForm({ business_flow: '', what: '', who: '', where_field: '', when_field: '', why: '', how_edge_cases: '', source_step1_ids: [], source_step2_ids: [], source_step3_ids: [] });
    setEditId(null); setShowForm(false);
  };

  const handleEdit = (row: Analysis5W1H) => {
    setForm({
      business_flow: row.business_flow, what: row.what, who: row.who,
      where_field: row.where_field, when_field: row.when_field, why: row.why,
      how_edge_cases: row.how_edge_cases,
      source_step1_ids: JSON.parse(row.source_step1_ids || '[]'),
      source_step2_ids: JSON.parse(row.source_step2_ids || '[]'),
      source_step3_ids: JSON.parse(row.source_step3_ids || '[]'),
    });
    setEditId(row.id); setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xóa dòng phân tích này?')) return;
    await fetch(`/api/projects/${projectId}/analysis/${id}`, { method: 'DELETE' });
    fetchData(); onRefresh();
  };

  const toggleSource = (field: 'source_step1_ids' | 'source_step2_ids' | 'source_step3_ids', id: number) => {
    setForm(f => ({
      ...f,
      [field]: (f[field] as number[]).includes(id)
        ? (f[field] as number[]).filter(x => x !== id)
        : [...(f[field] as number[]), id],
    }));
  };

  const totalSourceCount = (row: Analysis5W1H) =>
    (JSON.parse(row.source_step1_ids || '[]') as number[]).length +
    (JSON.parse(row.source_step2_ids || '[]') as number[]).length +
    (JSON.parse(row.source_step3_ids || '[]') as number[]).length;

  const hasSurveyData = survey.step1.length > 0 || survey.step2.length > 0 || survey.step3.length > 0;

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Phân tích 5W1H</h2>
          <p className="text-sm text-gray-500 mt-1">
            Bóc tách nghiệp vụ từ dữ liệu khảo sát. Mỗi dòng = 1 luồng nghiệp vụ. Liên kết trực tiếp đến nguồn Survey để đảm bảo <strong>Traceability</strong>.
          </p>
          {!hasSurveyData && (
            <div className="flex items-center gap-2 mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 w-fit">
              ⚠️ Hoàn thành Bước 1, 2, 3 trước để có dữ liệu nguồn cho phân tích
            </div>
          )}
        </div>
        {!isLocked && (
          <div className="flex items-center gap-2 shrink-0">
            <AIAssistant
              task="analysis_5w1h"
              context={{
                process_name: survey.step1[0]?.process_name || 'quy trình',
                department: survey.step1[0]?.department || '',
                role: survey.step1[0]?.role || '',
                steps: survey.step1[0] ? JSON.parse(survey.step1[0].process_steps || '[]').map((s: { step: string }) => s.step).join('; ') : '',
                pain_points: survey.step1[0] ? JSON.parse(survey.step1[0].pain_points || '[]').join('; ') : '',
                qa_highlights: survey.step2.slice(0, 5).map((q: SurveyStep2) => q.question).join('; '),
              }}
              label="AI phân tích 5W1H"
              hint="AI tự động điền 5W1H từ dữ liệu khảo sát"
              onResult={(result) => {
                if (result && typeof result === 'object' && !Array.isArray(result)) {
                  const r = result as Record<string, string>;
                  setForm((f) => ({
                    ...f,
                    what: r.what || '',
                    who: r.who || '',
                    where_field: r.where_field || '',
                    when_field: r.when_field || '',
                    why: r.why || '',
                    how_edge_cases: r.how_edge_cases || '',
                    business_flow: f.business_flow || survey.step1[0]?.process_name || '',
                  }));
                  setShowForm(true);
                }
              }}
            />
            <button onClick={() => { resetForm(); setShowForm(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">
              + Thêm phân tích
            </button>
          </div>
        )}
      </div>

      {rows.length === 0 && !showForm && (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="font-semibold text-gray-600 mb-1">Chưa có phân tích nào</p>
          <p className="text-gray-400 text-sm mb-4">Tổng hợp dữ liệu từ Bước 1-3 và phân rã thành các luồng nghiệp vụ</p>
          {!isLocked && hasSurveyData && <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg text-sm">Thêm phân tích đầu tiên</button>}
        </div>
      )}

      {/* Analysis rows */}
      <div className="space-y-3">
        {rows.map(row => {
          const isExpanded = expandedId === row.id;
          const srcCount = totalSourceCount(row);
          const s1ids = JSON.parse(row.source_step1_ids || '[]') as number[];
          const s2ids = JSON.parse(row.source_step2_ids || '[]') as number[];
          const s3ids = JSON.parse(row.source_step3_ids || '[]') as number[];

          return (
            <div key={row.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Header row */}
              <div className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-gray-50 border-b border-gray-100"
                onClick={() => setExpandedId(isExpanded ? null : row.id)}>
                <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700 font-bold text-xs shrink-0">{row.id}</div>
                <div className="flex-1 font-semibold text-gray-900">{row.business_flow}</div>
                <div className="flex items-center gap-2 shrink-0">
                  {srcCount > 0 && <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-semibold">🔗 {srcCount} nguồn</span>}
                  {row.how_edge_cases && <span className="text-xs bg-yellow-100 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full">⚠️ Edge cases</span>}
                  {!isLocked && <>
                    <button onClick={e => { e.stopPropagation(); handleEdit(row); }} className="text-blue-400 hover:text-blue-600 p-1">✏️</button>
                    <button onClick={e => { e.stopPropagation(); handleDelete(row.id); }} className="text-gray-300 hover:text-red-400 p-1">🗑️</button>
                  </>}
                  <span className="text-gray-400 ml-1">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Expanded 5W1H grid */}
              {isExpanded && (
                <div className="p-5">
                  <div className="flex justify-end mb-3">
                    <button
                      onClick={() => setDiagramIds(prev => {
                        const next = new Set(prev);
                        next.has(row.id) ? next.delete(row.id) : next.add(row.id);
                        return next;
                      })}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${diagramIds.has(row.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'}`}>
                      {diagramIds.has(row.id) ? '📋 Xem dạng bảng' : '📊 Xem Diagram'}
                    </button>
                  </div>
                  {diagramIds.has(row.id) ? (
                    <div className="mb-5">
                      <MermaidDiagram chart={build5W1HChart(row.business_flow, row.who, row.what, row.where_field, row.when_field, row.how_edge_cases)} />
                    </div>
                  ) : (
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {W_FIELDS.map(f => {
                      const val = (row as unknown as Record<string, string>)[f.key];
                      return (
                        <div key={f.key} className={`rounded-xl p-3 border ${f.key === 'how_edge_cases' ? 'col-span-3 border-orange-200 bg-orange-50' : 'border-gray-200 bg-gray-50'}`}>
                          <div className={`text-xs font-bold mb-1 ${f.key === 'how_edge_cases' ? 'text-orange-700' : 'text-gray-500'}`}>{f.emoji} {f.label}</div>
                          <div className={`text-sm whitespace-pre-wrap ${f.key === 'how_edge_cases' ? 'text-orange-900 font-medium' : 'text-gray-800'}`}>
                            {val || <span className="text-gray-300 italic">Chưa điền</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  )}

                  {/* Source links */}
                  {srcCount > 0 && (
                    <div>
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">🔗 Nguồn dữ liệu (Traceability)</div>
                      <div className="space-y-1.5">
                        {s1ids.map(id => {
                          const s = survey.step1.find(x => x.id === id);
                          return s ? <SourceChip key={id} label={s.process_name} badge="Bước 1" color="blue" /> : null;
                        })}
                        {s2ids.map(id => {
                          const s = survey.step2.find(x => x.id === id);
                          return s ? <SourceChip key={id} label={s.question} badge="Bước 2" color="yellow" pain={s.is_pain_point === 1} /> : null;
                        })}
                        {s3ids.map(id => {
                          const s = survey.step3.find(x => x.id === id);
                          return s ? <SourceChip key={id} label={s.observation} badge="Bước 3" color="green" pain={s.is_pain_point === 1} /> : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto" onClick={e => e.target === e.currentTarget && resetForm()}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">{editId ? 'Chỉnh sửa' : 'Thêm'} Phân tích 5W1H</h2>
                <p className="text-xs text-gray-400 mt-0.5">Bóc tách 1 luồng nghiệp vụ — liên kết đến dữ liệu khảo sát</p>
              </div>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Tên luồng nghiệp vụ <span className="text-red-500">*</span></label>
                <input value={form.business_flow} onChange={e => setForm(f => ({ ...f, business_flow: e.target.value }))}
                  placeholder="VD: Lập và phê duyệt Đơn đặt hàng (PO)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {W_FIELDS.map(f => (
                  <div key={f.key} className={f.key === 'how_edge_cases' ? 'col-span-2' : ''}>
                    <label className={`block text-sm font-semibold mb-1.5 ${f.key === 'how_edge_cases' ? 'text-red-700' : 'text-gray-700'}`}>
                      {f.emoji} {f.label} {f.key === 'how_edge_cases' && <span className="text-red-500">*</span>}
                      <span className="font-normal text-gray-400 text-xs ml-1">— {f.hint}</span>
                    </label>
                    <textarea value={(form as unknown as Record<string, string>)[f.key]}
                      onChange={e => setForm(ff => ({ ...ff, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      rows={f.key === 'how_edge_cases' ? 3 : 2}
                      required={f.key === 'how_edge_cases'}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 resize-none ${
                        f.key === 'how_edge_cases' ? 'border-orange-300 focus:ring-orange-400 bg-orange-50' : 'border-gray-300 focus:ring-blue-500'
                      }`} />
                  </div>
                ))}
              </div>

              {/* Source linking */}
              {hasSurveyData && (
                <div>
                  <div className="text-sm font-bold text-gray-700 mb-2">🔗 Liên kết nguồn dữ liệu (Traceability)</div>
                  {/* Tab selector */}
                  <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-3 w-fit">
                    {(['step1', 'step2', 'step3'] as const).map(tab => (
                      <button key={tab} type="button" onClick={() => setSourceTab(tab)}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${sourceTab === tab ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
                        {tab === 'step1' ? `📝 Bước 1 (${survey.step1.length})` : tab === 'step2' ? `💬 Bước 2 (${survey.step2.length})` : `👁️ Bước 3 (${survey.step3.length})`}
                      </button>
                    ))}
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                    {sourceTab === 'step1' && survey.step1.map(s => (
                      <label key={s.id} className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0">
                        <input type="checkbox" checked={form.source_step1_ids.includes(s.id)} onChange={() => toggleSource('source_step1_ids', s.id)} className="w-4 h-4 accent-blue-600" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-800 truncate">{s.process_name}</div>
                          <div className="text-xs text-gray-400">{s.department} · {s.role}</div>
                        </div>
                        {(JSON.parse(s.pain_points || '[]') as string[]).length > 0 && <span className="text-xs text-red-500 shrink-0">🔴 {(JSON.parse(s.pain_points || '[]') as string[]).length} pains</span>}
                      </label>
                    ))}
                    {sourceTab === 'step2' && survey.step2.map(s => (
                      <label key={s.id} className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0">
                        <input type="checkbox" checked={form.source_step2_ids.includes(s.id)} onChange={() => toggleSource('source_step2_ids', s.id)} className="w-4 h-4 accent-blue-600" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-700 truncate"><span className="font-semibold">Q:</span> {s.question}</div>
                        </div>
                        {s.is_pain_point === 1 && <span className="text-xs text-red-500 shrink-0">🔴</span>}
                        <span className="text-xs text-gray-400 shrink-0">{s.category}</span>
                      </label>
                    ))}
                    {sourceTab === 'step3' && survey.step3.map(s => (
                      <label key={s.id} className="flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0">
                        <input type="checkbox" checked={form.source_step3_ids.includes(s.id)} onChange={() => toggleSource('source_step3_ids', s.id)} className="w-4 h-4 accent-blue-600" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-700 truncate">{s.observation}</div>
                          <div className="text-xs text-gray-400">{s.action_type} · {s.duration_minutes > 0 ? `${s.duration_minutes} phút` : ''}</div>
                        </div>
                        {s.is_pain_point === 1 && <span className="text-xs text-red-500 shrink-0">🔴</span>}
                      </label>
                    ))}
                    {((sourceTab === 'step1' && !survey.step1.length) || (sourceTab === 'step2' && !survey.step2.length) || (sourceTab === 'step3' && !survey.step3.length)) && (
                      <div className="text-center py-6 text-gray-400 text-sm">Chưa có dữ liệu từ bước này</div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Đã chọn: {form.source_step1_ids.length} từ B1, {form.source_step2_ids.length} từ B2, {form.source_step3_ids.length} từ B3
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={resetForm}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">Hủy</button>
                <button type="submit" disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-bold disabled:opacity-50">
                  {submitting ? 'Đang lưu...' : editId ? '💾 Cập nhật' : '💾 Thêm phân tích'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SourceChip({ label, badge, color, pain }: { label: string; badge: string; color: string; pain?: boolean }) {
  const colorMap = { blue: 'bg-blue-50 border-blue-200 text-blue-700', yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700', green: 'bg-green-50 border-green-200 text-green-700' };
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs ${colorMap[color as keyof typeof colorMap]}`}>
      <span className="font-bold shrink-0">{badge}</span>
      <span className="truncate flex-1 text-gray-600">{label}</span>
      {pain && <span className="text-red-500 shrink-0">🔴</span>}
    </div>
  );
}

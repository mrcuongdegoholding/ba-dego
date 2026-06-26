'use client';
import { useEffect, useState } from 'react';
import type { SurveyStep1, ProcessStep } from '@/lib/types';
import AIAssistant from './AIAssistant';
import { useToast } from './Toast';
import dynamic from 'next/dynamic';
const MermaidDiagram = dynamic(() => import('./MermaidDiagram'), { ssr: false });

interface FormState {
  process_name: string;
  department: string;
  role: string;
  frequency: string;
  current_tools: string[];
  process_steps: ProcessStep[];
  input_documents: string[];
  output_documents: string[];
  pain_points: string[];
  notes: string;
  created_by: string;
}

const EMPTY: FormState = {
  process_name: '', department: '', role: '', frequency: '',
  current_tools: [], process_steps: [], input_documents: [],
  output_documents: [], pain_points: [], notes: '',
  created_by: 'Giang (BA)',
};

const COMMON_TOOLS = ['Excel', 'Word', 'Zalo', 'Email', 'Phần mềm kế toán', 'Giấy tay', 'App điện thoại'];

function sanitizeMermaid(text: string) {
  return text.replace(/["\[\]{}()]/g, '').replace(/\n/g, ' ').slice(0, 60);
}

function buildFlowchart(steps: ProcessStep[], title: string): string {
  if (!steps.length) return 'flowchart TD\n  A["Không có bước nào"]';
  const lines = ['flowchart TD'];
  // No emoji in node text — Mermaid renders inconsistently with emoji and can crash.
  lines.push(`  START(["Bắt đầu: ${sanitizeMermaid(title)}"])`);
  steps.forEach((s, i) => {
    const label = sanitizeMermaid(s.step);
    const tool = s.tool ? sanitizeMermaid(s.tool) : '';
    lines.push(`  S${i}["${i + 1}. ${label}${tool ? ` [${tool}]` : ''}"]`);
  });
  lines.push('  END(["Kết thúc"])');
  lines.push('  START --> S0');
  steps.forEach((_, i) => {
    if (i < steps.length - 1) lines.push(`  S${i} --> S${i + 1}`);
  });
  lines.push(`  S${steps.length - 1} --> END`);
  return lines.join('\n');
}

export default function Step1Tab({ projectId, isLocked, onRefresh }: { projectId: string; isLocked: boolean; onRefresh: () => void }) {
  const { error: toastError } = useToast();
  const [entries, setEntries] = useState<SurveyStep1[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [diagramIds, setDiagramIds] = useState<Set<number>>(new Set());
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  // Dynamic array inputs
  const [toolInput, setToolInput] = useState('');
  const [inDocInput, setInDocInput] = useState('');
  const [outDocInput, setOutDocInput] = useState('');
  const [painInput, setPainInput] = useState('');

  const fetchEntries = async () => {
    const res = await fetch(`/api/projects/${projectId}/survey/step1`);
    const data = await res.json();
    setEntries(data);
  };

  useEffect(() => { fetchEntries(); }, [projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch(`/api/projects/${projectId}/survey/step1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!res.ok) { toastError((await res.json()).error || 'Lưu thất bại'); setSubmitting(false); return; }
    setForm(EMPTY); setToolInput(''); setInDocInput(''); setOutDocInput(''); setPainInput('');
    setShowForm(false); setSubmitting(false);
    fetchEntries(); onRefresh();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xóa mục này?')) return;
    await fetch(`/api/projects/${projectId}/survey/step1/${id}`, { method: 'DELETE' });
    fetchEntries(); onRefresh();
  };

  const addToArray = (field: keyof FormState, value: string) => {
    if (!value.trim()) return;
    setForm(f => ({ ...f, [field]: [...(f[field] as string[]), value.trim()] }));
  };

  const removeFromArray = (field: keyof FormState, idx: number) => {
    setForm(f => ({ ...f, [field]: (f[field] as string[]).filter((_, i) => i !== idx) }));
  };

  const addProcessStep = () => {
    setForm(f => ({
      ...f,
      process_steps: [...f.process_steps, { order: f.process_steps.length + 1, step: '', tool: '', duration: '' }],
    }));
  };

  const updateProcessStep = (idx: number, field: keyof ProcessStep, value: string | number) => {
    setForm(f => {
      const steps = [...f.process_steps];
      steps[idx] = { ...steps[idx], [field]: value };
      return { ...f, process_steps: steps };
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Bước 1: Thu thập mô tả quy trình (As-Is)</h2>
          <p className="text-sm text-gray-500 mt-1">
            Cung cấp form có cấu trúc để User <strong>tự mô tả</strong> quy trình hiện tại. BA điền thay mặt hoặc user điền trực tiếp.
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 w-fit">
            💡 <strong>Hướng dẫn:</strong> Gửi link form cho User (Chị Ngân, v.v.), yêu cầu đính kèm file Excel/Word đang dùng
          </div>
        </div>
        {!isLocked && (
          <button onClick={() => setShowForm(true)}
            className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2">
            + Thêm Biểu mẫu
          </button>
        )}
      </div>

      {/* Entries list */}
      {entries.length === 0 && !showForm && (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="font-semibold text-gray-600 mb-1">Chưa có biểu mẫu nào</p>
          <p className="text-gray-400 text-sm mb-4">Điền form mô tả quy trình As-Is đầu tiên với User</p>
          {!isLocked && <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg text-sm">Điền biểu mẫu đầu tiên</button>}
        </div>
      )}

      <div className="space-y-4">
        {entries.map(entry => {
          const processSteps = JSON.parse(entry.process_steps || '[]') as ProcessStep[];
          const tools = JSON.parse(entry.current_tools || '[]') as string[];
          const inDocs = JSON.parse(entry.input_documents || '[]') as string[];
          const outDocs = JSON.parse(entry.output_documents || '[]') as string[];
          const pains = JSON.parse(entry.pain_points || '[]') as string[];
          const isExpanded = expandedId === entry.id;

          return (
            <div key={entry.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Card header */}
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedId(isExpanded ? null : entry.id)}>
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
                  {entry.id}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900">{entry.process_name}</div>
                  <div className="text-xs text-gray-400">{entry.department} · {entry.role} · <span className="text-gray-500">{entry.created_by}</span> · {entry.created_at}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {pains.length > 0 && <span className="text-xs bg-red-100 text-red-600 border border-red-200 px-2 py-0.5 rounded-full font-semibold">{pains.length} Pain Points</span>}
                  {processSteps.length > 0 && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{processSteps.length} bước</span>}
                  {!isLocked && <button onClick={e => { e.stopPropagation(); handleDelete(entry.id); }} className="text-gray-300 hover:text-red-400 p-1">🗑️</button>}
                  <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="p-5">
                  <div className="grid grid-cols-3 gap-4 mb-5">
                    <InfoBlock label="Phòng ban / Bộ phận" value={entry.department} />
                    <InfoBlock label="Vai trò người dùng" value={entry.role} />
                    <InfoBlock label="Tần suất thực hiện" value={entry.frequency || '—'} />
                  </div>

                  {/* Current tools */}
                  {tools.length > 0 && (
                    <Section title="🛠️ Công cụ đang sử dụng">
                      <div className="flex flex-wrap gap-2">
                        {tools.map((t, i) => <span key={i} className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full">{t}</span>)}
                      </div>
                    </Section>
                  )}

                  {/* Process steps */}
                  {processSteps.length > 0 && (
                    <Section title="🔄 Các bước thực hiện (As-Is)">
                      <div className="flex justify-end mb-2">
                        <button
                          onClick={() => setDiagramIds(prev => {
                            const next = new Set(prev);
                            next.has(entry.id) ? next.delete(entry.id) : next.add(entry.id);
                            return next;
                          })}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${diagramIds.has(entry.id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'}`}>
                          {diagramIds.has(entry.id) ? '📋 Xem dạng bảng' : '📊 Xem Diagram'}
                        </button>
                      </div>
                      {diagramIds.has(entry.id) ? (
                        <MermaidDiagram chart={buildFlowchart(processSteps, entry.process_name)} />
                      ) : (
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                              <tr>
                                <th className="text-left px-3 py-2 text-gray-500 font-semibold w-10">#</th>
                                <th className="text-left px-3 py-2 text-gray-500 font-semibold">Bước thực hiện</th>
                                <th className="text-left px-3 py-2 text-gray-500 font-semibold">Công cụ / App</th>
                                <th className="text-left px-3 py-2 text-gray-500 font-semibold w-24">Thời gian</th>
                              </tr>
                            </thead>
                            <tbody>
                              {processSteps.map((s, i) => (
                                <tr key={i} className="border-b border-gray-100 last:border-0">
                                  <td className="px-3 py-2 text-gray-400 font-semibold">{s.order}</td>
                                  <td className="px-3 py-2 text-gray-800">{s.step}</td>
                                  <td className="px-3 py-2 text-gray-500">{s.tool || '—'}</td>
                                  <td className="px-3 py-2 text-gray-500">{s.duration || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </Section>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {inDocs.length > 0 && (
                      <Section title="📥 Tài liệu đầu vào (Input)">
                        <ul className="space-y-1">{inDocs.map((d, i) => <li key={i} className="text-sm text-gray-700 flex items-center gap-2"><span className="text-gray-300">·</span>{d}</li>)}</ul>
                      </Section>
                    )}
                    {outDocs.length > 0 && (
                      <Section title="📤 Tài liệu đầu ra (Output)">
                        <ul className="space-y-1">{outDocs.map((d, i) => <li key={i} className="text-sm text-gray-700 flex items-center gap-2"><span className="text-gray-300">·</span>{d}</li>)}</ul>
                      </Section>
                    )}
                  </div>

                  {pains.length > 0 && (
                    <Section title="🔴 Pain Points (Khó khăn hiện tại)">
                      <ul className="space-y-1.5">
                        {pains.map((p, i) => (
                          <li key={i} className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-sm text-red-800">
                            <span className="text-red-400 font-bold shrink-0">{i+1}.</span>{p}
                          </li>
                        ))}
                      </ul>
                    </Section>
                  )}

                  {entry.notes && (
                    <Section title="📝 Ghi chú thêm">
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{entry.notes}</p>
                    </Section>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900 text-base">Biểu mẫu Bước 1: Mô tả quy trình As-Is</h2>
                <p className="text-xs text-gray-400 mt-0.5">Điền cùng User hoặc gửi cho User tự điền</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Section 1: Basic info */}
              <div>
                <SectionTitle>1. Thông tin cơ bản</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Tên quy trình / Tác vụ *" required>
                    <input value={form.process_name} onChange={e => setForm(f => ({ ...f, process_name: e.target.value }))}
                      placeholder="VD: Lập Đơn đặt hàng (PO)" className={inputCls} required />
                  </FormField>
                  <FormField label="Phòng ban / Bộ phận *" required>
                    <input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                      placeholder="VD: Phòng Thu mua" className={inputCls} required />
                  </FormField>
                  <FormField label="Vai trò người thực hiện *" required>
                    <input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                      placeholder="VD: Nhân viên Thu mua, Chị Ngân" className={inputCls} required />
                  </FormField>
                  <FormField label="Tần suất thực hiện">
                    <input value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                      placeholder="VD: Hàng ngày, ~5 lần/ngày" className={inputCls} />
                  </FormField>
                  <div className="col-span-2">
                    <FormField label="Người ghi / Thực hiện phỏng vấn">
                      <select value={form.created_by} onChange={e => setForm(f => ({ ...f, created_by: e.target.value }))} className={inputCls}>
                        <option>Giang (BA)</option><option>Cường (Tech Lead)</option>
                        <option>Bảo (Dev)</option><option>Phú (PM)</option>
                      </select>
                    </FormField>
                  </div>
                </div>
              </div>

              {/* Section 2: Tools */}
              <div>
                <SectionTitle>2. Công cụ đang sử dụng</SectionTitle>
                <div className="flex flex-wrap gap-2 mb-2">
                  {COMMON_TOOLS.map(t => (
                    <button key={t} type="button"
                      onClick={() => !form.current_tools.includes(t) && setForm(f => ({ ...f, current_tools: [...f.current_tools, t] }))}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${form.current_tools.includes(t) ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}>
                      {t}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={toolInput} onChange={e => setToolInput(e.target.value)}
                    placeholder="Thêm công cụ khác..." className={`${inputCls} flex-1`}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addToArray('current_tools', toolInput); setToolInput(''); } }} />
                  <button type="button" onClick={() => { addToArray('current_tools', toolInput); setToolInput(''); }}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold text-gray-600">+ Thêm</button>
                </div>
                <TagList items={form.current_tools} onRemove={i => removeFromArray('current_tools', i)} />
              </div>

              {/* Section 3: Process steps */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <SectionTitle>3. Các bước thực hiện</SectionTitle>
                  <div className="flex items-center gap-2">
                    <AIAssistant
                      task="step1_steps"
                      context={{ process_name: form.process_name, department: form.department, role: form.role, tools: form.current_tools.join(', ') }}
                      label="AI gợi ý bước"
                      hint="Dùng AI để tự động tạo các bước quy trình từ mô tả"
                      disabled={!form.process_name}
                      onResult={(result) => {
                        if (Array.isArray(result)) {
                          setForm(f => ({
                            ...f,
                            process_steps: result.map((s: { step: string; tool: string; duration: string }, i: number) => ({
                              order: i + 1, step: s.step, tool: s.tool, duration: s.duration,
                            })),
                          }));
                        }
                      }}
                    />
                    <button type="button" onClick={addProcessStep}
                      className="text-sm text-blue-600 hover:text-blue-700 font-semibold">+ Thêm bước</button>
                  </div>
                </div>
                {form.process_steps.length === 0 && (
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center text-sm text-gray-400">
                    Nhấn &quot;+ Thêm bước&quot; hoặc dùng <strong>✨ AI gợi ý</strong> để tạo tự động
                  </div>
                )}
                {form.process_steps.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left px-3 py-2 text-gray-500 w-10">#</th>
                          <th className="text-left px-3 py-2 text-gray-500">Mô tả bước thực hiện</th>
                          <th className="text-left px-3 py-2 text-gray-500 w-32">Công cụ / App</th>
                          <th className="text-left px-3 py-2 text-gray-500 w-28">Thời gian (~)</th>
                          <th className="w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.process_steps.map((s, i) => (
                          <tr key={i} className="border-b border-gray-100 last:border-0">
                            <td className="px-3 py-1.5 text-gray-400 font-bold">{i + 1}</td>
                            <td className="px-3 py-1.5">
                              <input value={s.step} onChange={e => updateProcessStep(i, 'step', e.target.value)}
                                placeholder="Mô tả bước này..." className="w-full border-0 focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5 text-sm" />
                            </td>
                            <td className="px-3 py-1.5">
                              <input value={s.tool} onChange={e => updateProcessStep(i, 'tool', e.target.value)}
                                placeholder="Excel, Zalo..." className="w-full border-0 focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5 text-sm" />
                            </td>
                            <td className="px-3 py-1.5">
                              <input value={s.duration} onChange={e => updateProcessStep(i, 'duration', e.target.value)}
                                placeholder="5 phút" className="w-full border-0 focus:ring-1 focus:ring-blue-400 rounded px-1 py-0.5 text-sm" />
                            </td>
                            <td className="px-2">
                              <button type="button" onClick={() => setForm(f => ({ ...f, process_steps: f.process_steps.filter((_, j) => j !== i) }))}
                                className="text-gray-300 hover:text-red-400 text-base">×</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Section 4: Documents */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <SectionTitle>4. Tài liệu Đầu vào (Input)</SectionTitle>
                  <div className="flex gap-2">
                    <input value={inDocInput} onChange={e => setInDocInput(e.target.value)}
                      placeholder="VD: PR từ xưởng, Danh sách NCC..."
                      className={`${inputCls} flex-1`}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addToArray('input_documents', inDocInput); setInDocInput(''); } }} />
                    <button type="button" onClick={() => { addToArray('input_documents', inDocInput); setInDocInput(''); }}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold text-gray-600">+</button>
                  </div>
                  <TagList items={form.input_documents} onRemove={i => removeFromArray('input_documents', i)} color="blue" />
                </div>
                <div>
                  <SectionTitle>5. Tài liệu Đầu ra (Output)</SectionTitle>
                  <div className="flex gap-2">
                    <input value={outDocInput} onChange={e => setOutDocInput(e.target.value)}
                      placeholder="VD: PO đã ký, Báo cáo so sánh giá..."
                      className={`${inputCls} flex-1`}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addToArray('output_documents', outDocInput); setOutDocInput(''); } }} />
                    <button type="button" onClick={() => { addToArray('output_documents', outDocInput); setOutDocInput(''); }}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold text-gray-600">+</button>
                  </div>
                  <TagList items={form.output_documents} onRemove={i => removeFromArray('output_documents', i)} color="green" />
                </div>
              </div>

              {/* Section 5: Pain points */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <SectionTitle>6. Khó khăn / Pain Points hiện tại <span className="text-red-500">*</span></SectionTitle>
                  <AIAssistant
                    task="step1_pain_points"
                    context={{ process_name: form.process_name, department: form.department, tools: form.current_tools.join(', '), steps: form.process_steps.map(s => s.step).join('; ') }}
                    label="AI phân tích pain points"
                    hint="Dùng AI phân tích các điểm đau tiềm ẩn"
                    disabled={!form.process_name}
                    onResult={(result) => {
                      if (Array.isArray(result)) setForm(f => ({ ...f, pain_points: result as string[] }));
                    }}
                  />
                </div>
                <p className="text-xs text-gray-400 mb-2">Những điều User thấy bất tiện, tốn thời gian, dễ sai sót trong quy trình hiện tại</p>
                <div className="flex gap-2">
                  <input value={painInput} onChange={e => setPainInput(e.target.value)}
                    placeholder="VD: Phải copy thủ công từ 3 file Excel mỗi lần lập PO..."
                    className={`${inputCls} flex-1`}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addToArray('pain_points', painInput); setPainInput(''); } }} />
                  <button type="button" onClick={() => { addToArray('pain_points', painInput); setPainInput(''); }}
                    className="px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-sm font-semibold text-red-600">+ Thêm</button>
                </div>
                {form.pain_points.map((p, i) => (
                  <div key={i} className="flex items-start gap-2 mt-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-sm text-red-800">
                    <span className="font-bold shrink-0 text-red-400">{i+1}.</span>
                    <span className="flex-1">{p}</span>
                    <button type="button" onClick={() => removeFromArray('pain_points', i)} className="text-red-300 hover:text-red-500 shrink-0">×</button>
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div>
                <SectionTitle>7. Ghi chú thêm</SectionTitle>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Thông tin bổ sung, hệ thống hiện tại đang dùng, kỳ vọng của User..."
                  rows={3} className={`${inputCls} resize-none`} />
              </div>

              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">
                  Hủy
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-8 rounded-lg text-sm font-bold disabled:opacity-50">
                  {submitting ? 'Đang lưu...' : '💾 Lưu Biểu mẫu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="font-bold text-gray-800 text-sm mb-3 pb-1.5 border-b border-gray-100">{children}</div>;
}

function FormField({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</div>
      {children}
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="text-xs text-gray-400 font-semibold mb-0.5">{label}</div>
      <div className="text-sm font-semibold text-gray-800">{value}</div>
    </div>
  );
}

function TagList({ items, onRemove, color = 'gray' }: { items: string[]; onRemove: (i: number) => void; color?: string }) {
  if (items.length === 0) return null;
  const cls = color === 'blue' ? 'bg-blue-50 text-blue-700 border-blue-200' : color === 'green' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-700 border-gray-200';
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {items.map((item, i) => (
        <span key={i} className={`inline-flex items-center gap-1 text-xs border px-2.5 py-1 rounded-full ${cls}`}>
          {item}
          <button type="button" onClick={() => onRemove(i)} className="opacity-60 hover:opacity-100 font-bold leading-none">×</button>
        </span>
      ))}
    </div>
  );
}

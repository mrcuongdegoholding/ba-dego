'use client';
import { useEffect, useState } from 'react';
import type { SurveyStep1, SurveyStep2 } from '@/lib/types';
import AIAssistant from './AIAssistant';
import { useToast } from './Toast';

type QACategory = 'normal' | 'edge_case' | 'exception' | 'approval_flow';

const CATEGORY_META: Record<QACategory, { label: string; color: string; desc: string }> = {
  normal:        { label: 'Luồng thường',   color: 'bg-blue-50 text-blue-700 border-blue-200',   desc: 'Quy trình diễn ra bình thường' },
  edge_case:     { label: 'Trường hợp đặc biệt', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', desc: 'Tình huống không thường gặp' },
  exception:     { label: 'Ngoại lệ / Lỗi', color: 'bg-red-50 text-red-700 border-red-200',      desc: 'Xử lý khi có sự cố' },
  approval_flow: { label: 'Luồng duyệt',    color: 'bg-purple-50 text-purple-700 border-purple-200', desc: 'Quy trình phê duyệt' },
};

const SUGGESTED_QUESTIONS = [
  { q: 'Nếu hệ thống gặp lỗi / mạng chập chờn thì [tên User] xử lý thế nào?', cat: 'exception' as QACategory },
  { q: 'Nếu cần duyệt gấp nhưng Giám đốc không có mặt, [tên User] làm gì?', cat: 'approval_flow' as QACategory },
  { q: 'Khi nào thì [tên User] phải gọi Zalo/điện thoại thay vì dùng hệ thống?', cat: 'edge_case' as QACategory },
  { q: 'Nếu nhà cung cấp báo giá trễ deadline, [tên User] xử lý thế nào?', cat: 'edge_case' as QACategory },
  { q: 'Tháng cao điểm khối lượng công việc tăng, quy trình có thay đổi không?', cat: 'edge_case' as QACategory },
];

export default function Step2Tab({ projectId, isLocked, onRefresh }: { projectId: string; isLocked: boolean; onRefresh: () => void }) {
  const { error: toastError } = useToast();
  const [entries, setEntries] = useState<SurveyStep2[]>([]);
  const [step1s, setStep1s] = useState<SurveyStep1[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [category, setCategory] = useState<QACategory>('normal');
  const [isPainPoint, setIsPainPoint] = useState(false);
  const [followUp, setFollowUp] = useState('');
  const [step1Id, setStep1Id] = useState<string>('');
  const [createdBy, setCreatedBy] = useState('Giang (BA)');
  const [submitting, setSubmitting] = useState(false);
  const [filterCat, setFilterCat] = useState<string>('all');

  const fetchData = async () => {
    const [s2, s1] = await Promise.all([
      fetch(`/api/projects/${projectId}/survey/step2`).then(r => r.json()),
      fetch(`/api/projects/${projectId}/survey/step1`).then(r => r.json()),
    ]);
    setEntries(s2); setStep1s(s1);
  };

  useEffect(() => { fetchData(); }, [projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch(`/api/projects/${projectId}/survey/step2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, answer, category, is_pain_point: isPainPoint, follow_up: followUp, step1_id: step1Id || null, created_by: createdBy }),
    });
    if (!res.ok) { toastError((await res.json()).error || 'Lưu thất bại'); setSubmitting(false); return; }
    setQuestion(''); setAnswer(''); setCategory('normal'); setIsPainPoint(false); setFollowUp('');
    setShowForm(false); setSubmitting(false);
    fetchData(); onRefresh();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xóa Q&A này?')) return;
    await fetch(`/api/projects/${projectId}/survey/step2/${id}`, { method: 'DELETE' });
    fetchData(); onRefresh();
  };

  const useSuggestedQ = (q: string, cat: QACategory) => {
    setQuestion(q); setCategory(cat); setShowForm(true);
  };

  const filtered = filterCat === 'all' ? entries : entries.filter(e => e.category === filterCat);
  const painCount = entries.filter(e => e.is_pain_point).length;
  const edgeCount = entries.filter(e => e.category === 'edge_case').length;

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Bước 2: Phỏng vấn sâu (Q&A)</h2>
          <p className="text-sm text-gray-500 mt-1">
            Tổ chức buổi phỏng vấn 1-1. <strong>Không hỏi &quot;Quy trình là gì?&quot;</strong> — hãy hỏi <strong>&quot;Làm sao xử lý ca này?&quot;</strong>. Focus vào ngoại lệ và edge cases.
          </p>
          {step1s.length > 0 && (
            <div className="flex items-center gap-2 mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 w-fit">
              💡 Dựa trên <strong>{step1s.length}</strong> quy trình đã thu thập ở Bước 1 để chuẩn bị câu hỏi
            </div>
          )}
        </div>
        {!isLocked && (
          <div className="flex items-center gap-2 shrink-0">
            <AIAssistant
              task="step2_questions"
              context={{
                process_name: step1s[0]?.process_name || 'quy trình',
                role: step1s[0]?.role || '',
                department: step1s[0]?.department || '',
                pain_points: step1s[0] ? JSON.parse(step1s[0].pain_points || '[]').join('; ') : '',
              }}
              label="AI tạo câu hỏi"
              hint="AI tạo 12 câu hỏi phỏng vấn đủ 4 loại"
              onResult={(result) => {
                if (Array.isArray(result)) {
                  const items = result as { question: string; category: string }[];
                  // Batch add all questions
                  Promise.all(items.map(item =>
                    fetch(`/api/projects/${projectId}/survey/step2`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ question: item.question, answer: '', category: item.category, is_pain_point: false, step1_id: step1s[0]?.id || null }),
                    })
                  )).then(() => { fetchData(); onRefresh(); });
                }
              }}
            />
            <button onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">
              + Thêm Q&A
            </button>
          </div>
        )}
      </div>

      {/* Stats row */}
      {entries.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Tổng câu hỏi', value: entries.length, color: 'text-gray-700 bg-gray-50 border-gray-200' },
            { label: 'Pain Points', value: painCount, color: 'text-red-700 bg-red-50 border-red-200' },
            { label: 'Edge Cases', value: edgeCount, color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
            { label: 'Cần follow-up', value: entries.filter(e => e.follow_up).length, color: 'text-purple-700 bg-purple-50 border-purple-200' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-3 ${s.color}`}>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs font-semibold mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Suggested questions (shown when no entries yet) */}
      {entries.length === 0 && !showForm && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5">
          <div className="font-semibold text-blue-800 text-sm mb-3">💡 Câu hỏi gợi ý theo nguyên tắc 5W1H & Đào sâu ngoại lệ</div>
          <div className="space-y-2">
            {SUGGESTED_QUESTIONS.map((sq, i) => (
              <button key={i} type="button" onClick={() => useSuggestedQ(sq.q, sq.cat)}
                className="w-full text-left text-sm text-blue-700 bg-white border border-blue-200 rounded-lg px-3 py-2 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors flex items-center gap-2">
                <span className={`text-xs px-1.5 py-0.5 rounded border font-semibold shrink-0 ${CATEGORY_META[sq.cat].color}`}>{CATEGORY_META[sq.cat].label}</span>
                {sq.q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      {entries.length > 0 && (
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
          {[['all', 'Tất cả'], ...Object.entries(CATEGORY_META).map(([k, v]) => [k, v.label])].map(([key, label]) => (
            <button key={key} onClick={() => setFilterCat(key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${filterCat === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {label} {key !== 'all' && <span className="ml-1 text-gray-400">({entries.filter(e => e.category === key).length})</span>}
            </button>
          ))}
        </div>
      )}

      {/* Q&A list */}
      {filtered.length === 0 && !showForm && entries.length === 0 && (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-10 text-center">
          <div className="text-3xl mb-2">💬</div>
          <p className="font-semibold text-gray-600 mb-4">Chưa có Q&A nào</p>
          {!isLocked && <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg text-sm">Thêm Q&A đầu tiên</button>}
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((entry, idx) => {
          const meta = CATEGORY_META[entry.category as QACategory] || CATEGORY_META.normal;
          const linkedStep1 = step1s.find(s => s.id === entry.step1_id);
          return (
            <div key={entry.id} className={`bg-white rounded-xl border overflow-hidden ${entry.is_pain_point ? 'border-red-200' : 'border-gray-200'}`}>
              <div className="px-5 py-4">
                {/* Q row */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">Q</div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 text-sm">{entry.question}</div>
                    {linkedStep1 && (
                      <div className="text-xs text-gray-400 mt-0.5">Liên quan đến: <span className="text-blue-600">{linkedStep1.process_name}</span></div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-xs border px-2 py-0.5 rounded-full font-semibold ${meta.color}`}>{meta.label}</span>
                    {entry.is_pain_point && <span className="text-xs bg-red-100 text-red-600 border border-red-200 px-2 py-0.5 rounded-full font-semibold">🔴 Pain Point</span>}
                    {!isLocked && <button onClick={() => handleDelete(entry.id)} className="text-gray-300 hover:text-red-400 p-0.5 ml-1">🗑️</button>}
                  </div>
                </div>
                {/* A row */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">A</div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">{entry.answer}</div>
                  </div>
                </div>
                {/* Follow-up */}
                {entry.follow_up && (
                  <div className="mt-3 flex items-start gap-2 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
                    <span className="text-purple-400 text-sm shrink-0">→</span>
                    <div>
                      <div className="text-xs font-semibold text-purple-700 mb-0.5">Cần làm rõ thêm:</div>
                      <div className="text-sm text-purple-700">{entry.follow_up}</div>
                    </div>
                  </div>
                )}
                <div className="mt-2 text-xs text-gray-400">{entry.created_by} · {entry.created_at}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">Thêm Q&A Phỏng vấn</h2>
                <p className="text-xs text-gray-400 mt-0.5">Ghi lại câu hỏi và câu trả lời từ buổi phỏng vấn User</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Category selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phân loại câu hỏi</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(CATEGORY_META) as [QACategory, typeof CATEGORY_META[QACategory]][]).map(([key, meta]) => (
                    <button key={key} type="button" onClick={() => setCategory(key)}
                      className={`text-left px-3 py-2.5 rounded-lg border-2 transition-colors ${category === key ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className={`text-xs font-bold px-2 py-0.5 rounded-full border w-fit mb-1 ${meta.color}`}>{meta.label}</div>
                      <div className="text-xs text-gray-500">{meta.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Link to Step 1 */}
              {step1s.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Liên quan đến quy trình (Bước 1)</label>
                  <select value={step1Id} onChange={e => setStep1Id(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">— Không chọn —</option>
                    {step1s.map(s => <option key={s.id} value={s.id}>{s.process_name} ({s.department})</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Câu hỏi <span className="text-red-500">*</span></label>
                <textarea value={question} onChange={e => setQuestion(e.target.value)}
                  placeholder="VD: Nếu nhà cung cấp báo giá trễ hạn, chị xử lý thế nào? Có ai cần thông báo không?"
                  rows={2} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Câu trả lời của User <span className="text-red-500">*</span></label>
                <textarea value={answer} onChange={e => setAnswer(e.target.value)}
                  placeholder="Ghi lại câu trả lời của User (nguyên văn hoặc tóm tắt)"
                  rows={3} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isPainPoint} onChange={e => setIsPainPoint(e.target.checked)}
                    className="w-4 h-4 accent-red-500" />
                  <span className="text-sm font-semibold text-red-700">🔴 Đây là Pain Point</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cần làm rõ thêm / Follow-up</label>
                <input value={followUp} onChange={e => setFollowUp(e.target.value)}
                  placeholder="Điểm cần hỏi thêm trong lần phỏng vấn tiếp theo..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Người phỏng vấn</label>
                <select value={createdBy} onChange={e => setCreatedBy(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white">
                  <option>Giang (BA)</option><option>Cường (Tech Lead)</option>
                  <option>Bảo (Dev)</option><option>Phú (PM)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">Hủy</button>
                <button type="submit" disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-bold disabled:opacity-50">
                  {submitting ? 'Đang lưu...' : '💾 Lưu Q&A'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

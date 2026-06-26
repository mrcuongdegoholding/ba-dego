'use client';
import { useState } from 'react';

export type AITask =
  | 'step1_steps'
  | 'step1_pain_points'
  | 'step2_questions'
  | 'step3_observations'
  | 'analysis_5w1h'
  | 'backlog_story'
  | 'general';

interface AIAssistantProps {
  task: AITask;
  context: Record<string, unknown>;
  label: string;
  hint?: string;
  onResult: (result: unknown) => void;
  disabled?: boolean;
}

export default function AIAssistant({ task, context, label, hint, onResult, disabled }: AIAssistantProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [preview, setPreview] = useState<unknown>(null);

  const handleGenerate = async () => {
    setLoading(true); setError(''); setShowPreview(false);
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, context }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Lỗi AI'); setLoading(false); return; }
      setPreview(data.result);
      setShowPreview(true);
    } catch {
      setError('Không kết nối được AI. Kiểm tra mạng và API Key.');
    }
    setLoading(false);
  };

  const handleApply = () => {
    onResult(preview);
    setShowPreview(false);
  };

  return (
    <div className="inline-block">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={disabled || loading}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all
          ${loading
            ? 'bg-violet-50 border-violet-200 text-violet-400 cursor-wait'
            : 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100 hover:border-violet-300'
          } disabled:opacity-50`}
        title={hint}>
        {loading ? (
          <>
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            AI đang viết...
          </>
        ) : (
          <>
            <span>✨</span>
            {label}
          </>
        )}
      </button>

      {error && (
        <div className="mt-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 flex items-start gap-1.5">
          <span className="shrink-0">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {showPreview && preview !== null && (
        <AIPreview task={task} preview={preview} onApply={handleApply} onDiscard={() => setShowPreview(false)} />
      )}
    </div>
  );
}

// ─── Preview panel showing AI result before applying ──────────────────────────
function AIPreview({ task, preview, onApply, onDiscard }: {
  task: AITask; preview: unknown; onApply: () => void; onDiscard: () => void;
}) {
  return (
    <div className="mt-2 bg-violet-50 border border-violet-200 rounded-xl p-3 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-violet-700 flex items-center gap-1">✨ Gợi ý từ AI</span>
        <div className="flex gap-1.5">
          <button onClick={onApply}
            className="text-xs bg-violet-600 hover:bg-violet-700 text-white font-bold px-3 py-1 rounded-lg">
            ✓ Áp dụng
          </button>
          <button onClick={onDiscard}
            className="text-xs border border-violet-300 text-violet-600 px-2.5 py-1 rounded-lg hover:bg-violet-100">
            Bỏ
          </button>
        </div>
      </div>
      <div className="text-xs text-violet-600 italic mb-2">Xem lại nội dung trước khi áp dụng. AI có thể mắc lỗi — hãy kiểm tra kỹ.</div>
      <PreviewContent task={task} data={preview} />
    </div>
  );
}

function PreviewContent({ task, data }: { task: AITask; data: unknown }) {
  if (typeof data === 'string') {
    return <pre className="text-xs text-slate-700 whitespace-pre-wrap bg-white rounded-lg p-2 border border-violet-100 max-h-48 overflow-y-auto">{data}</pre>;
  }

  if (task === 'step1_steps' && Array.isArray(data)) {
    return (
      <div className="bg-white rounded-lg border border-violet-100 overflow-hidden max-h-48 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-violet-50"><tr>
            <th className="text-left px-2 py-1 text-violet-600">#</th>
            <th className="text-left px-2 py-1 text-violet-600">Bước</th>
            <th className="text-left px-2 py-1 text-violet-600">Công cụ</th>
            <th className="text-left px-2 py-1 text-violet-600">Thời gian</th>
          </tr></thead>
          <tbody>
            {(data as { step: string; tool: string; duration: string }[]).map((s, i) => (
              <tr key={i} className="border-t border-violet-50">
                <td className="px-2 py-1 text-slate-400">{i + 1}</td>
                <td className="px-2 py-1 text-slate-700">{s.step}</td>
                <td className="px-2 py-1 text-slate-500">{s.tool}</td>
                <td className="px-2 py-1 text-slate-500">{s.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (task === 'step1_pain_points' && Array.isArray(data)) {
    return (
      <ul className="space-y-1 max-h-48 overflow-y-auto">
        {(data as string[]).map((p, i) => (
          <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700 bg-white rounded px-2 py-1 border border-violet-100">
            <span className="text-red-400 shrink-0">●</span>{p}
          </li>
        ))}
      </ul>
    );
  }

  if (task === 'step2_questions' && Array.isArray(data)) {
    const catColors: Record<string, string> = {
      normal: 'bg-blue-100 text-blue-700',
      edge_case: 'bg-amber-100 text-amber-700',
      exception: 'bg-red-100 text-red-700',
      approval_flow: 'bg-purple-100 text-purple-700',
    };
    return (
      <div className="space-y-1 max-h-56 overflow-y-auto">
        {(data as { question: string; category: string }[]).map((q, i) => (
          <div key={i} className="flex items-start gap-2 bg-white rounded px-2 py-1.5 border border-violet-100">
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${catColors[q.category] || 'bg-slate-100 text-slate-600'}`}>
              {q.category}
            </span>
            <span className="text-xs text-slate-700">{q.question}</span>
          </div>
        ))}
      </div>
    );
  }

  if (task === 'step3_observations' && Array.isArray(data)) {
    const potColors: Record<string, string> = {
      high: 'text-green-600', medium: 'text-amber-600', low: 'text-slate-400'
    };
    return (
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {(data as { observation: string; action_type: string; automation_potential: string }[]).map((o, i) => (
          <div key={i} className="flex items-start gap-2 bg-white rounded px-2 py-1.5 border border-violet-100">
            <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full shrink-0">{o.action_type}</span>
            <span className="text-xs text-slate-700 flex-1">{o.observation}</span>
            <span className={`text-xs font-bold shrink-0 ${potColors[o.automation_potential] || ''}`}>
              {o.automation_potential === 'high' ? '⚡' : o.automation_potential === 'medium' ? '○' : '↓'}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (task === 'analysis_5w1h' && typeof data === 'object' && data !== null) {
    const d = data as Record<string, string>;
    return (
      <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto">
        {[
          ['What', d.what], ['Who', d.who], ['Where', d.where_field],
          ['When', d.when_field], ['Why', d.why],
        ].map(([k, v]) => (
          <div key={k} className="bg-white rounded border border-violet-100 px-2 py-1.5">
            <div className="text-xs font-bold text-violet-600 mb-0.5">{k}</div>
            <div className="text-xs text-slate-700">{v}</div>
          </div>
        ))}
        <div className="bg-orange-50 rounded border border-orange-200 px-2 py-1.5 col-span-2">
          <div className="text-xs font-bold text-orange-600 mb-0.5">How + Edge Cases</div>
          <div className="text-xs text-slate-700">{d.how_edge_cases}</div>
        </div>
      </div>
    );
  }

  if (task === 'backlog_story' && typeof data === 'object' && data !== null) {
    const d = data as { user_story: string; acceptance_criteria: string; priority: string };
    return (
      <div className="space-y-2">
        <div className="bg-white rounded border border-violet-100 px-2 py-1.5">
          <div className="text-xs font-bold text-violet-600 mb-0.5">User Story</div>
          <div className="text-xs text-slate-700 italic">{d.user_story}</div>
        </div>
        <div className="bg-white rounded border border-violet-100 px-2 py-1.5">
          <div className="text-xs font-bold text-violet-600 mb-0.5">Acceptance Criteria</div>
          <pre className="text-xs text-slate-700 whitespace-pre-wrap">{d.acceptance_criteria}</pre>
        </div>
        <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-semibold">{d.priority}</span>
      </div>
    );
  }

  return <pre className="text-xs text-slate-600 whitespace-pre-wrap bg-white rounded p-2 border border-violet-100 max-h-48 overflow-y-auto">{JSON.stringify(data, null, 2)}</pre>;
}

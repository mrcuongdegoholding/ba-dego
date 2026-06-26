'use client';
import { useEffect, useState } from 'react';
import EvaluationPanel from './EvaluationPanel';
import { getCriteriaForEntity, getTotalItems, type EntityType } from '@/lib/criteria';

interface Step1Entry { id: number; process_name: string; department: string; }
interface Step2Entry { id: number; question: string; }
interface Step3Entry { id: number; observation: string; }
interface AnalysisEntry { id: number; business_flow: string; }
interface BacklogEntry { id: number; user_story: string; }

const ENTITY_SECTIONS: { type: EntityType; icon: string; label: string; color: string }[] = [
  { type: 'step1',    icon: '📝', label: 'Bước 1 — Mô tả quy trình',    color: 'text-blue-700' },
  { type: 'step2',    icon: '💬', label: 'Bước 2 — Phỏng vấn Q&A',       color: 'text-green-700' },
  { type: 'step3',    icon: '👁️', label: 'Bước 3 — Quan sát thực tế',    color: 'text-teal-700' },
  { type: 'analysis', icon: '🔍', label: 'Phân tích 5W1H',                color: 'text-indigo-700' },
  { type: 'backlog',  icon: '📌', label: 'Product Backlog (User Stories)', color: 'text-slate-700' },
];

export default function EvaluationTab({ projectId }: { projectId: string }) {
  const [step1, setStep1] = useState<Step1Entry[]>([]);
  const [step2, setStep2] = useState<Step2Entry[]>([]);
  const [step3, setStep3] = useState<Step3Entry[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisEntry[]>([]);
  const [backlog, setBacklog] = useState<BacklogEntry[]>([]);
  const [scores, setScores] = useState<Record<string, { checked: number; total: number }>>({});
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${projectId}/survey/summary`).then(r => r.json()),
      fetch(`/api/projects/${projectId}/analysis`).then(r => r.json()),
      fetch(`/api/projects/${projectId}/backlog`).then(r => r.json()),
      fetch(`/api/projects/${projectId}/evaluation`).then(r => r.json()),
    ]).then(([summary, ana, bl, evalData]) => {
      setStep1(summary.step1);
      setStep2(summary.step2);
      setStep3(summary.step3);
      setAnalysis(ana.filter((a: AnalysisEntry) => !('is_change_request' in a)));
      setBacklog(bl.filter((b: { is_change_request: number }) => !b.is_change_request));

      // Compute scores per entity
      const scoreMap: Record<string, { checked: number; total: number }> = {};
      for (const row of evalData as { entity_type: string; entity_id: number | null; checked: number }[]) {
        const key = row.entity_id !== null ? `${row.entity_type}::${row.entity_id}` : row.entity_type;
        if (!scoreMap[key]) {
          const total = getTotalItems(getCriteriaForEntity(row.entity_type as EntityType));
          scoreMap[key] = { checked: 0, total };
        }
        if (row.checked) scoreMap[key].checked++;
      }
      setScores(scoreMap);
    });
  }, [projectId]);

  const entities: Record<EntityType, { id: number; label: string }[]> = {
    step1:    step1.map(e => ({ id: e.id, label: e.process_name })),
    step2:    [], // evaluated per-step1, not per Q&A
    step3:    [],
    analysis: analysis.map(e => ({ id: e.id, label: e.business_flow })),
    backlog:  backlog.map(e => ({ id: e.id, label: e.user_story.slice(0, 60) + (e.user_story.length > 60 ? '…' : '') })),
  };

  // For step2/step3, evaluate at project level (grouped under step1)
  const step2EntityId: number | null = null;
  const step3EntityId: number | null = null;

  const getScore = (type: EntityType, id: number | null) => {
    const key = id !== null ? `${type}::${id}` : type;
    const s = scores[key];
    if (!s) return { checked: 0, total: getTotalItems(getCriteriaForEntity(type)) };
    return s;
  };

  const getScoreColor = (pct: number) =>
    pct >= 80 ? 'text-green-600 bg-green-50' : pct >= 50 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Đánh giá Chất lượng</h2>
          <p className="text-sm text-slate-500 mt-1">
            Bộ tiêu chí 13 nhóm theo chuẩn DX. Đánh giá từng hạng mục để đảm bảo Dev không có cơ hội hỏi lại.
          </p>
        </div>
        <button onClick={() => window.print()}
          className="no-print border border-slate-300 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-slate-100 flex items-center gap-1">
          🖨️ In báo cáo đánh giá
        </button>
      </div>

      {/* Overview summary */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {ENTITY_SECTIONS.map(sec => {
          const items = sec.type === 'step2' ? [] : sec.type === 'step3' ? [] : entities[sec.type];
          const totalEntities = sec.type === 'step2' ? (step2.length > 0 ? 1 : 0) : sec.type === 'step3' ? (step3.length > 0 ? 1 : 0) : items.length;
          const entityId = sec.type === 'step2' ? step2EntityId : sec.type === 'step3' ? step3EntityId : null;
          const score = totalEntities === 0 ? null : sec.type === 'step2' || sec.type === 'step3'
            ? getScore(sec.type, entityId)
            : items.reduce((acc, item) => {
                const s = getScore(sec.type, item.id);
                return { checked: acc.checked + s.checked, total: acc.total + s.total };
              }, { checked: 0, total: 0 });
          const pct = score && score.total > 0 ? Math.round((score.checked / score.total) * 100) : 0;
          return (
            <div key={sec.type} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
              <div className="text-2xl mb-1">{sec.icon}</div>
              <div className="text-xs font-semibold text-slate-600 mb-1.5 leading-tight">{sec.label.split('—')[0].trim()}</div>
              {totalEntities === 0 ? (
                <div className="text-xs text-slate-300">Chưa có dữ liệu</div>
              ) : (
                <div className={`text-lg font-bold rounded-full px-2 py-0.5 inline-block ${getScoreColor(pct)}`}>{pct}%</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Section details */}
      <div className="space-y-4">
        {/* Step 1 */}
        <SectionBlock title="📝 Bước 1 — Mô tả quy trình" count={step1.length}>
          {step1.length === 0 ? (
            <Empty text="Chưa có dữ liệu Bước 1" />
          ) : (
            step1.map(entry => (
              <EntityBlock key={entry.id} label={`Quy trình: ${entry.process_name}`} subLabel={entry.department}
                score={getScore('step1', entry.id)}
                open={activeSection === `step1-${entry.id}`}
                onToggle={() => setActiveSection(s => s === `step1-${entry.id}` ? null : `step1-${entry.id}`)}>
                <EvaluationPanel projectId={projectId} entityType="step1" entityId={entry.id}
                  title={`Đánh giá: ${entry.process_name}`} collapsible={false} />
              </EntityBlock>
            ))
          )}
        </SectionBlock>

        {/* Step 2 */}
        <SectionBlock title="💬 Bước 2 — Phỏng vấn Q&A" count={step2.length}>
          {step2.length === 0 ? (
            <Empty text="Chưa có dữ liệu Bước 2" />
          ) : (
            <EntityBlock label={`Toàn bộ ${step2.length} câu hỏi phỏng vấn`}
              score={getScore('step2', null)}
              open={activeSection === 'step2'}
              onToggle={() => setActiveSection(s => s === 'step2' ? null : 'step2')}>
              <EvaluationPanel projectId={projectId} entityType="step2" entityId={null}
                title="Đánh giá chất lượng Phỏng vấn Q&A" collapsible={false} />
            </EntityBlock>
          )}
        </SectionBlock>

        {/* Step 3 */}
        <SectionBlock title="👁️ Bước 3 — Quan sát thực tế" count={step3.length}>
          {step3.length === 0 ? (
            <Empty text="Chưa có dữ liệu Bước 3" />
          ) : (
            <EntityBlock label={`Toàn bộ ${step3.length} quan sát shadowing`}
              score={getScore('step3', null)}
              open={activeSection === 'step3'}
              onToggle={() => setActiveSection(s => s === 'step3' ? null : 'step3')}>
              <EvaluationPanel projectId={projectId} entityType="step3" entityId={null}
                title="Đánh giá chất lượng Quan sát Shadowing" collapsible={false} />
            </EntityBlock>
          )}
        </SectionBlock>

        {/* Analysis */}
        <SectionBlock title="🔍 Phân tích 5W1H" count={analysis.length}>
          {analysis.length === 0 ? (
            <Empty text="Chưa có dữ liệu Phân tích" />
          ) : (
            analysis.map(entry => (
              <EntityBlock key={entry.id} label={`Flow: ${entry.business_flow}`}
                score={getScore('analysis', entry.id)}
                open={activeSection === `analysis-${entry.id}`}
                onToggle={() => setActiveSection(s => s === `analysis-${entry.id}` ? null : `analysis-${entry.id}`)}>
                <EvaluationPanel projectId={projectId} entityType="analysis" entityId={entry.id}
                  title={`Đánh giá: ${entry.business_flow}`} collapsible={false} />
              </EntityBlock>
            ))
          )}
        </SectionBlock>

        {/* Backlog */}
        <SectionBlock title="📌 Product Backlog" count={backlog.length}>
          {backlog.length === 0 ? (
            <Empty text="Chưa có User Story" />
          ) : (
            backlog.map(entry => (
              <EntityBlock key={entry.id} label={entry.user_story.slice(0, 80) + (entry.user_story.length > 80 ? '…' : '')}
                score={getScore('backlog', entry.id)}
                open={activeSection === `backlog-${entry.id}`}
                onToggle={() => setActiveSection(s => s === `backlog-${entry.id}` ? null : `backlog-${entry.id}`)}>
                <EvaluationPanel projectId={projectId} entityType="backlog" entityId={entry.id}
                  title="Đánh giá User Story (13 tiêu chí)" collapsible={false} />
              </EntityBlock>
            ))
          )}
        </SectionBlock>
      </div>
    </div>
  );
}

function SectionBlock({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
        <span className="text-xs text-slate-400">{count} mục</span>
      </div>
      <div className="p-3 space-y-2">{children}</div>
    </div>
  );
}

function EntityBlock({ label, subLabel, score, open, onToggle, children }: {
  label: string; subLabel?: string;
  score: { checked: number; total: number };
  open: boolean; onToggle: () => void;
  children: React.ReactNode;
}) {
  const pct = score.total > 0 ? Math.round((score.checked / score.total) * 100) : 0;
  const barColor = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400';
  const badgeColor = pct >= 80 ? 'bg-green-100 text-green-700' : pct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600';

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button onClick={onToggle}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-slate-800 text-sm truncate">{label}</div>
          {subLabel && <div className="text-xs text-slate-400">{subLabel}</div>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${badgeColor}`}>{pct}%</span>
          <svg className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {open && <div className="border-t border-slate-100 p-3 animate-fade-in">{children}</div>}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="text-xs text-slate-300 italic px-2 py-2">{text}</div>;
}

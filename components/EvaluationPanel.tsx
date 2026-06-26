'use client';
import { useEffect, useState, useCallback } from 'react';
import { getCriteriaForEntity, getTotalItems, type EntityType, type CriterionGroup } from '@/lib/criteria';
import { useAuth } from '@/lib/auth-context';

interface CheckState {
  [key: string]: boolean; // `${group}::${itemKey}` => checked
}

interface Props {
  projectId: string;
  entityType: EntityType;
  entityId: number | null; // null = project-level
  title?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export default function EvaluationPanel({ projectId, entityType, entityId, title, collapsible = true, defaultOpen = false }: Props) {
  const { user } = useAuth();
  const [checks, setChecks] = useState<CheckState>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const criteria = getCriteriaForEntity(entityType);
  const totalItems = getTotalItems(criteria);
  const checkedCount = Object.values(checks).filter(Boolean).length;
  const pct = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

  const fetchChecks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ entity_type: entityType });
      if (entityId !== null) params.set('entity_id', String(entityId));
      const res = await fetch(`/api/projects/${projectId}/evaluation?${params}`);
      const data = await res.json();
      const state: CheckState = {};
      for (const row of data) {
        state[`${row.criterion_group}::${row.item_key}`] = row.checked === 1;
      }
      setChecks(state);
    } finally {
      setLoading(false);
    }
  }, [projectId, entityType, entityId]);

  useEffect(() => { fetchChecks(); }, [fetchChecks]);

  const handleToggle = async (group: string, itemKey: string) => {
    const key = `${group}::${itemKey}`;
    const newVal = !checks[key];

    // Optimistic update
    setChecks(prev => ({ ...prev, [key]: newVal }));
    setSaving(key);

    await fetch(`/api/projects/${projectId}/evaluation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity_type: entityType,
        entity_id: entityId,
        criterion_group: group,
        item_key: itemKey,
        checked: newVal,
        updated_by: user?.full_name || 'BA',
      }),
    });
    setSaving(null);
  };

  const scoreColor = pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600';
  const barColor  = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400';
  const scoreLabel = pct >= 80 ? '✅ Đạt' : pct >= 50 ? '⚠️ Cần bổ sung' : '❌ Chưa đạt';

  const panelContent = (
    <div className="space-y-5">
      {loading ? (
        <div className="text-sm text-slate-400 py-4 text-center animate-pulse">Đang tải tiêu chí...</div>
      ) : (
        criteria.map(group => (
          <CriteriaGroup
            key={group.group}
            group={group}
            checks={checks}
            saving={saving}
            onToggle={handleToggle}
          />
        ))
      )}
    </div>
  );

  if (!collapsible) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <EvalHeader checkedCount={checkedCount} totalItems={totalItems} pct={pct}
          scoreColor={scoreColor} barColor={barColor} scoreLabel={scoreLabel}
          title={title || 'Bộ tiêu chí đánh giá'} />
        <div className="p-4">{panelContent}</div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border overflow-hidden ${pct >= 80 ? 'border-green-200' : pct >= 50 ? 'border-amber-200' : 'border-red-200'}`}>
      <button
        onClick={() => setIsOpen(v => !v)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:opacity-90 transition-opacity ${
          pct >= 80 ? 'bg-green-50' : pct >= 50 ? 'bg-amber-50' : 'bg-red-50'
        }`}>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-slate-800">{title || 'Đánh giá chất lượng'}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              pct >= 80 ? 'bg-green-100 text-green-700' :
              pct >= 50 ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>{scoreLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/60 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`text-xs font-bold tabular-nums ${scoreColor}`}>{checkedCount}/{totalItems} ({pct}%)</span>
          </div>
        </div>
        <svg className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="bg-white p-4 border-t border-slate-100 animate-fade-in">
          {panelContent}
        </div>
      )}
    </div>
  );
}

function EvalHeader({ checkedCount, totalItems, pct, scoreColor, barColor, scoreLabel, title }: {
  checkedCount: number; totalItems: number; pct: number;
  scoreColor: string; barColor: string; scoreLabel: string; title: string;
}) {
  return (
    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold text-sm text-slate-800">{title}</span>
        <span className={`text-xs font-bold ${scoreColor}`}>{scoreLabel} — {checkedCount}/{totalItems} tiêu chí</span>
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function CriteriaGroup({ group, checks, saving, onToggle }: {
  group: CriterionGroup;
  checks: CheckState;
  saving: string | null;
  onToggle: (group: string, key: string) => void;
}) {
  const groupChecked = group.items.filter(i => checks[`${group.group}::${i.key}`]).length;
  const groupTotal = group.items.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${group.badgeColor}`}>{group.title}</span>
        <span className="text-xs text-slate-400 font-semibold">{groupChecked}/{groupTotal}</span>
      </div>
      <div className="space-y-1.5 pl-1">
        {group.items.map(item => {
          const key = `${group.group}::${item.key}`;
          const checked = checks[key] || false;
          const isSaving = saving === key;
          return (
            <label key={item.key}
              className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors group ${
                checked ? 'bg-green-50' : 'hover:bg-slate-50'
              }`}>
              <div className="mt-0.5 relative shrink-0">
                <input type="checkbox" checked={checked} onChange={() => onToggle(group.group, item.key)}
                  className="sr-only" />
                <div className={`w-4.5 h-4.5 w-[18px] h-[18px] rounded flex items-center justify-center border-2 transition-all ${
                  checked
                    ? 'bg-green-500 border-green-500'
                    : 'border-slate-300 bg-white group-hover:border-blue-400'
                } ${isSaving ? 'opacity-50' : ''}`}>
                  {checked && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <span className={`text-sm leading-snug ${checked ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-700'}`}>
                {item.label}
                {item.hint && <span className="block text-xs text-slate-400 mt-0.5 no-underline">{item.hint}</span>}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ─── Score Badge (for embedding in tab headers) ────────────────────────────────
export function EvalScoreBadge({ projectId, entityType, entityId }: {
  projectId: string; entityType: EntityType; entityId: number | null;
}) {
  const [score, setScore] = useState<{ pct: number; checked: number; total: number } | null>(null);

  useEffect(() => {
    const criteria = getCriteriaForEntity(entityType);
    const total = getTotalItems(criteria);
    const params = new URLSearchParams({ entity_type: entityType });
    if (entityId !== null) params.set('entity_id', String(entityId));
    fetch(`/api/projects/${projectId}/evaluation?${params}`)
      .then(r => r.json())
      .then((data: { checked: number }[]) => {
        const checked = data.filter(d => d.checked === 1).length;
        setScore({ pct: total > 0 ? Math.round((checked / total) * 100) : 0, checked, total });
      });
  }, [projectId, entityType, entityId]);

  if (!score) return null;
  const color = score.pct >= 80 ? 'bg-green-100 text-green-700' : score.pct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
  return (
    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${color}`}>{score.pct}%</span>
  );
}

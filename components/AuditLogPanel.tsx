'use client';
import { useEffect, useState } from 'react';

interface AuditRow {
  id: number;
  project_id: number | null;
  project_name: string | null;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: number | null;
  detail: string;
  created_at: string;
}

const ACTION_META: Record<string, { label: string; cls: string }> = {
  FREEZE_PROJECT: { label: 'Freeze dự án', cls: 'bg-red-100 text-red-700' },
  UNLOCK_BACKLOG: { label: 'Mở khóa (CR)', cls: 'bg-amber-100 text-amber-700' },
  LOCK_BACKLOG:   { label: 'Chốt User Story', cls: 'bg-slate-100 text-slate-600' },
  APPROVE_CR:     { label: 'Duyệt CR', cls: 'bg-green-100 text-green-700' },
  REJECT_CR:      { label: 'Từ chối CR', cls: 'bg-red-100 text-red-600' },
  CREATE_PROJECT: { label: 'Tạo dự án', cls: 'bg-blue-100 text-blue-700' },
  CREATE_USER:    { label: 'Tạo người dùng', cls: 'bg-indigo-100 text-indigo-700' },
};

const FILTERS = ['', 'FREEZE_PROJECT', 'UNLOCK_BACKLOG', 'APPROVE_CR', 'REJECT_CR', 'CREATE_PROJECT'];

export default function AuditLogPanel() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = filter ? `?action=${filter}` : '';
    fetch(`/api/audit${q}`).then(r => r.json()).then(d => { setRows(Array.isArray(d) ? d : []); setLoading(false); });
  }, [filter]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-xs font-semibold text-slate-500">Lọc:</span>
        {FILTERS.map(f => (
          <button key={f || 'all'} onClick={() => setFilter(f)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${filter === f ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
            {f ? (ACTION_META[f]?.label || f) : 'Tất cả'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-slate-500 font-semibold w-44">Thời gian</th>
              <th className="text-left px-4 py-3 text-slate-500 font-semibold w-40">Người thực hiện</th>
              <th className="text-left px-4 py-3 text-slate-500 font-semibold w-36">Hành động</th>
              <th className="text-left px-4 py-3 text-slate-500 font-semibold">Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Đang tải...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Chưa có nhật ký nào</td></tr>
            ) : rows.map(r => {
              const m = ACTION_META[r.action] || { label: r.action, cls: 'bg-slate-100 text-slate-600' };
              return (
                <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-400 text-xs font-mono">{r.created_at}</td>
                  <td className="px-4 py-2.5 text-slate-700 font-medium">{r.user_name}</td>
                  <td className="px-4 py-2.5"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${m.cls}`}>{m.label}</span></td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs">
                    {r.project_name && <span className="text-blue-500">[{r.project_name}] </span>}
                    {r.detail || `${r.entity_type}#${r.entity_id ?? '—'}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

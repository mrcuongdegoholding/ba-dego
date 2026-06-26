'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ReportData {
  byStatus: Record<string, number>;
  surveyStats: {
    id: number; name: string;
    step1_count: number; step2_count: number; step3_count: number;
    analysis_count: number; backlog_count: number;
    p0_count: number; p1_count: number; p2_count: number;
    cr_count: number; cr_pending: number; cr_approved: number;
  }[];
  totals: {
    projects: number; locked: number;
    surveyEntries: number; qaEntries: number; observations: number;
    analysisRows: number; backlogItems: number; crPending: number;
    evalChecked: number; evalTotal: number;
  };
}

const STATUS_ORDER = ['Khởi tạo', 'Đang khảo sát', 'Đang phân tích', 'Đã chốt yêu cầu', 'Đang Code'];
const STATUS_COLORS: Record<string, string> = {
  'Khởi tạo': 'bg-slate-100 text-slate-600',
  'Đang khảo sát': 'bg-blue-100 text-blue-700',
  'Đang phân tích': 'bg-amber-100 text-amber-700',
  'Đã chốt yêu cầu': 'bg-red-100 text-red-700',
  'Đang Code': 'bg-green-100 text-green-700',
};

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reports').then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  const handlePrint = () => window.print();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Đang tải báo cáo...</div>
  );

  if (!data) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 no-print">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Báo cáo & Thống kê</h1>
            <p className="text-sm text-slate-500 mt-0.5">Tổng hợp tiến độ khảo sát và phân tích nghiệp vụ</p>
          </div>
          <button onClick={handlePrint}
            className="flex items-center gap-2 border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-100">
            🖨️ In báo cáo
          </button>
        </div>

        {/* Print title */}
        <div className="hidden print-only mb-6">
          <div className="print-title">BÁO CÁO TIẾN ĐỘ KHẢO SÁT NGHIỆP VỤ — DEGO HOLDING</div>
          <div className="text-sm text-slate-500">Ngày in: {new Date().toLocaleDateString('vi-VN')}</div>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Tổng dự án', value: data.totals.projects, sub: `${data.totals.locked} đã Freeze`, color: 'border-blue-200 bg-blue-50', textColor: 'text-blue-700' },
            { label: 'Tổng Backlog Items', value: data.totals.backlogItems, sub: `${data.totals.crPending} CR chờ duyệt`, color: 'border-indigo-200 bg-indigo-50', textColor: 'text-indigo-700' },
            { label: 'Phân tích 5W1H', value: data.totals.analysisRows, sub: `${data.totals.qaEntries} Q&A · ${data.totals.observations} quan sát`, color: 'border-amber-200 bg-amber-50', textColor: 'text-amber-700' },
            { label: 'Tiêu chí đã đánh giá', value: data.totals.evalChecked, sub: `/ ${data.totals.evalTotal} tiêu chí`, color: 'border-green-200 bg-green-50', textColor: 'text-green-700' },
          ].map(kpi => (
            <div key={kpi.label} className={`rounded-xl border p-4 ${kpi.color}`}>
              <div className={`text-3xl font-bold mb-0.5 ${kpi.textColor}`}>{kpi.value}</div>
              <div className="font-semibold text-slate-700 text-sm">{kpi.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Status breakdown */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="text-base">📊</span> Phân bổ theo Trạng thái
            </h2>
            <div className="space-y-2">
              {STATUS_ORDER.map(status => {
                const cnt = data.byStatus[status] || 0;
                const pct = data.totals.projects > 0 ? Math.round((cnt / data.totals.projects) * 100) : 0;
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[status]}`}>{status}</span>
                      <span className="text-sm font-bold text-slate-700">{cnt} dự án</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Survey coverage */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="text-base">📋</span> Độ phủ Khảo sát
            </h2>
            <div className="space-y-3">
              {[
                { label: 'Bước 1 – Mô tả quy trình', value: data.totals.surveyEntries, color: 'bg-blue-500' },
                { label: 'Bước 2 – Phỏng vấn Q&A', value: data.totals.qaEntries, color: 'bg-indigo-500' },
                { label: 'Bước 3 – Quan sát thực tế', value: data.totals.observations, color: 'bg-violet-500' },
                { label: 'Phân tích 5W1H', value: data.totals.analysisRows, color: 'bg-amber-500' },
                { label: 'Backlog Items', value: data.totals.backlogItems, color: 'bg-green-500' },
              ].map(item => {
                const max = Math.max(data.totals.surveyEntries, data.totals.qaEntries, data.totals.observations, data.totals.analysisRows, data.totals.backlogItems, 1);
                return (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="text-xs text-slate-600 w-40 shrink-0">{item.label}</div>
                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${item.color}`} style={{ width: `${(item.value / max) * 100}%` }} />
                    </div>
                    <span className="text-sm font-bold text-slate-700 w-8 text-right">{item.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Project detail table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <span>📁</span> Chi tiết từng Dự án
            </h2>
            <span className="text-xs text-slate-400">{data.surveyStats.length} dự án</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-500 font-semibold">Dự án</th>
                  <th className="text-center px-3 py-3 text-slate-500 font-semibold">B1</th>
                  <th className="text-center px-3 py-3 text-slate-500 font-semibold">B2</th>
                  <th className="text-center px-3 py-3 text-slate-500 font-semibold">B3</th>
                  <th className="text-center px-3 py-3 text-slate-500 font-semibold">5W1H</th>
                  <th className="text-center px-3 py-3 text-slate-500 font-semibold">P0</th>
                  <th className="text-center px-3 py-3 text-slate-500 font-semibold">P1</th>
                  <th className="text-center px-3 py-3 text-slate-500 font-semibold">P2</th>
                  <th className="text-center px-3 py-3 text-slate-500 font-semibold">CR</th>
                  <th className="text-center px-3 py-3 text-slate-500 font-semibold">CR⏳</th>
                </tr>
              </thead>
              <tbody>
                {(data.surveyStats as typeof data.surveyStats[0][]).map(p => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/projects/${p.id}`} className="font-medium text-blue-700 hover:underline">{p.name}</Link>
                    </td>
                    <Cnt val={p.step1_count} />
                    <Cnt val={p.step2_count} />
                    <Cnt val={p.step3_count} />
                    <Cnt val={p.analysis_count} />
                    <Cnt val={p.p0_count} color="text-red-600" />
                    <Cnt val={p.p1_count} color="text-orange-600" />
                    <Cnt val={p.p2_count} />
                    <Cnt val={p.cr_count} color="text-amber-600" />
                    <Cnt val={p.cr_pending} color={p.cr_pending > 0 ? 'text-orange-600 font-bold' : undefined} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 bg-slate-50 text-xs text-slate-400 border-t border-slate-100">
            B1=Bước 1 · B2=Bước 2 · B3=Bước 3 · CR=Change Requests · CR⏳=CR chờ duyệt
          </div>
        </div>
      </div>
    </div>
  );
}

function Cnt({ val, color }: { val: number; color?: string }) {
  return (
    <td className={`text-center px-3 py-3 font-semibold tabular-nums ${val === 0 ? 'text-slate-300' : (color || 'text-slate-700')}`}>
      {val === 0 ? '—' : val}
    </td>
  );
}

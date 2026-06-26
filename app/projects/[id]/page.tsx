'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { use } from 'react';
import type { Project } from '@/lib/types';
import Step1Tab from '@/components/Step1Tab';
import Step2Tab from '@/components/Step2Tab';
import Step3Tab from '@/components/Step3Tab';
import AnalysisTab from '@/components/AnalysisTab';
import BacklogTab from '@/components/BacklogTab';
import EvaluationTab from '@/components/EvaluationTab';
import { useAuth } from '@/lib/auth-context';
import { canEdit as canEditFn, canFreeze as canFreezeFn } from '@/lib/permissions';
import { useRouter } from 'next/navigation';

type Tab = 'step1' | 'step2' | 'step3' | 'analysis' | 'backlog' | 'evaluation';

interface TabMeta { key: Tab; icon: string; label: string; sub: string }

const TABS: TabMeta[] = [
  { key: 'step1',      icon: '📝', label: 'Bước 1', sub: 'Thu thập mô tả' },
  { key: 'step2',      icon: '💬', label: 'Bước 2', sub: 'Phỏng vấn Q&A' },
  { key: 'step3',      icon: '👁️', label: 'Bước 3', sub: 'Quan sát thực tế' },
  { key: 'analysis',   icon: '🔍', label: 'Phân tích', sub: '5W1H Analysis' },
  { key: 'backlog',    icon: '📌', label: 'Backlog', sub: 'User Stories' },
  { key: 'evaluation', icon: '✅', label: 'Đánh giá', sub: 'Bộ tiêu chí' },
];

const STATUS_FLOW = ['Khởi tạo', 'Đang khảo sát', 'Đang phân tích', 'Đã chốt yêu cầu', 'Đang Code'];
const STATUS_COLORS: Record<string, string> = {
  'Khởi tạo':        'bg-slate-100 text-slate-600',
  'Đang khảo sát':   'bg-blue-100 text-blue-700',
  'Đang phân tích':  'bg-amber-100 text-amber-700',
  'Đã chốt yêu cầu':'bg-red-100 text-red-700',
  'Đang Code':       'bg-green-100 text-green-700',
};

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('step1');
  const [freezeConfirm, setFreezeConfirm] = useState(false);
  const [counts, setCounts] = useState({ s1: 0, s2: 0, s3: 0, analysis: 0, backlog: 0 });

  const fetchProject = async () => {
    const res = await fetch(`/api/projects/${id}`);
    if (res.ok) setProject(await res.json());
  };

  const fetchCounts = async () => {
    const [s, a, b] = await Promise.all([
      fetch(`/api/projects/${id}/survey/summary`).then(r => r.json()),
      fetch(`/api/projects/${id}/analysis`).then(r => r.json()),
      fetch(`/api/projects/${id}/backlog`).then(r => r.json()),
    ]);
    setCounts({ s1: s.step1.length, s2: s.step2.length, s3: s.step3.length, analysis: a.length, backlog: b.length });
  };

  useEffect(() => { fetchProject(); fetchCounts(); }, [id]);

  // Redirect unauthenticated users to login once auth has resolved.
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  const handleFreeze = async () => {
    await fetch(`/api/projects/${id}/freeze`, { method: 'POST' });
    setFreezeConfirm(false);
    fetchProject();
  };

  const handleStatusChange = async (status: string) => {
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchProject();
  };

  const handlePrint = () => window.print();
  const handleExportBRD = () => window.open(`/projects/${project?.id}/print`, '_blank');

  if (!project) return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-50 flex items-center justify-center">
      <div className="text-slate-400 text-sm animate-pulse">Đang tải dự án...</div>
    </div>
  );

  const stakes = JSON.parse(project.stakeholders || '[]') as string[];
  const canEdit = canEditFn(user);
  const canFreeze = canFreezeFn(user);

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-50 flex flex-col">
      {/* Sub-header: breadcrumb + actions */}
      <div className="bg-white border-b border-slate-200 flex-shrink-0 no-print">
        <div className="flex items-center px-4 py-0 h-12">
          <Link href="/projects" className="text-slate-400 hover:text-blue-600 text-sm mr-2">← Dự án</Link>
          <span className="text-slate-300 mr-2">/</span>
          <span className="text-slate-800 font-semibold text-sm truncate max-w-xs">{project.name}</span>
          {project.is_locked === 1 && (
            <span className="ml-2 text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full font-semibold">🔒 Frozen</span>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <select value={project.status}
              onChange={e => handleStatusChange(e.target.value)}
              disabled={project.is_locked === 1 || !canEdit}
              className={`border border-slate-300 rounded-lg text-xs px-2 py-1 focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50 font-semibold ${STATUS_COLORS[project.status]}`}>
              {STATUS_FLOW.map(s => <option key={s}>{s}</option>)}
            </select>
            <button onClick={handlePrint}
              className="border border-slate-300 text-slate-600 text-xs font-medium px-3 py-1 rounded-lg hover:bg-slate-50 flex items-center gap-1">
              🖨️ In
            </button>
            <button onClick={handleExportBRD}
              className="border border-blue-300 text-blue-600 bg-blue-50 hover:bg-blue-100 text-xs font-semibold px-3 py-1 rounded-lg flex items-center gap-1">
              📄 Xuất BRD
            </button>
            {project.is_locked === 0 && canFreeze && (
              <button onClick={() => setFreezeConfirm(true)}
                className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-lg">
                🔒 Freeze
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-56 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col no-print">
          {/* Project info */}
          <div className="p-3 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-sm leading-snug mb-1 line-clamp-2">{project.name}</h2>
            {project.description && (
              <p className="text-xs text-slate-400 leading-relaxed mb-2 line-clamp-3">{project.description}</p>
            )}
            {stakes.length > 0 && (
              <div>
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Stakeholders</div>
                <div className="flex flex-wrap gap-1">
                  {stakes.map((s, i) => (
                    <span key={i} className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full truncate max-w-[120px]" title={s}>{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-2 overflow-y-auto">
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider px-2 mb-1.5">Khảo sát 3 bước</div>
            {TABS.slice(0, 3).map(tab => (
              <NavItem key={tab.key} tab={tab} active={activeTab === tab.key}
                count={tab.key === 'step1' ? counts.s1 : tab.key === 'step2' ? counts.s2 : counts.s3}
                onClick={() => setActiveTab(tab.key)} />
            ))}

            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider px-2 mt-3 mb-1.5">Phân tích & Kế hoạch</div>
            {TABS.slice(3, 5).map(tab => (
              <NavItem key={tab.key} tab={tab} active={activeTab === tab.key}
                count={tab.key === 'analysis' ? counts.analysis : counts.backlog}
                onClick={() => setActiveTab(tab.key)} />
            ))}

            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider px-2 mt-3 mb-1.5">Kiểm soát chất lượng</div>
            <NavItem tab={TABS[5]} active={activeTab === 'evaluation'} count={0} showCount={false}
              onClick={() => setActiveTab('evaluation')} />
          </nav>

          {/* Progress checklist */}
          <div className="p-3 border-t border-slate-100">
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Tiến độ</div>
            <div className="space-y-1">
              {[
                { label: 'Mô tả quy trình', done: counts.s1 > 0 },
                { label: 'Phỏng vấn Q&A', done: counts.s2 > 0 },
                { label: 'Quan sát thực tế', done: counts.s3 > 0 },
                { label: 'Phân tích 5W1H', done: counts.analysis > 0 },
                { label: 'Product Backlog', done: counts.backlog > 0 },
                { label: 'Freeze & Sign-off', done: project.is_locked === 1 },
              ].map(({ label, done }) => (
                <div key={label} className="flex items-center gap-2 text-xs">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs shrink-0 font-bold ${
                    done ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'
                  }`}>{done ? '✓' : '·'}</span>
                  <span className={done ? 'text-slate-700' : 'text-slate-400'}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-5 print-container">
          {/* Print header */}
          <div className="hidden print-only mb-4">
            <div className="print-title">{project.name}</div>
            <div className="text-sm text-slate-500 mb-1">{project.description}</div>
            <div className="text-xs text-slate-400">Trạng thái: {project.status} · Stakeholders: {stakes.join(', ')}</div>
          </div>

          {activeTab === 'step1'      && <Step1Tab projectId={id} isLocked={project.is_locked === 1} onRefresh={fetchCounts} />}
          {activeTab === 'step2'      && <Step2Tab projectId={id} isLocked={project.is_locked === 1} onRefresh={fetchCounts} />}
          {activeTab === 'step3'      && <Step3Tab projectId={id} isLocked={project.is_locked === 1} onRefresh={fetchCounts} />}
          {activeTab === 'analysis'   && <AnalysisTab projectId={id} isLocked={project.is_locked === 1} onRefresh={fetchCounts} />}
          {activeTab === 'backlog'    && <BacklogTab projectId={id} isLocked={project.is_locked === 1} onRefresh={fetchCounts} />}
          {activeTab === 'evaluation' && <EvaluationTab projectId={id} />}
        </main>
      </div>

      {/* Freeze confirmation */}
      {freezeConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="text-4xl text-center mb-3">🔒</div>
            <h2 className="font-bold text-lg text-center text-slate-900 mb-2">Xác nhận Freeze dự án?</h2>
            <p className="text-sm text-slate-500 text-center mb-5">
              Sau khi Freeze, <strong>toàn bộ Backlog bị khóa</strong>. Mọi yêu cầu mới phải đi qua <strong>Change Request</strong> và cần duyệt trước khi Dev code.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setFreezeConfirm(false)}
                className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50">Hủy</button>
              <button onClick={handleFreeze}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-lg text-sm font-bold">Xác nhận Freeze</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavItem({ tab, active, count, showCount = true, onClick }: {
  tab: TabMeta; active: boolean; count: number; showCount?: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-0.5 text-left transition-colors ${
        active ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
      }`}>
      <span className="text-sm w-4 text-center shrink-0">{tab.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">{tab.label}</div>
        <div className={`text-xs truncate ${active ? 'text-blue-200' : 'text-slate-400'}`}>{tab.sub}</div>
      </div>
      {showCount && count > 0 && (
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shrink-0 ${
          active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
        }`}>{count}</span>
      )}
    </button>
  );
}

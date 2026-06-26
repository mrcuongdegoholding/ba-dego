'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Project } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';

const STATUS_META: Record<string, { color: string; dot: string; step: number }> = {
  'Khởi tạo':        { color: 'bg-slate-100 text-slate-600 border-slate-200',  dot: 'bg-slate-400',  step: 0 },
  'Đang khảo sát':   { color: 'bg-blue-100 text-blue-700 border-blue-200',     dot: 'bg-blue-500',   step: 1 },
  'Đang phân tích':  { color: 'bg-amber-100 text-amber-700 border-amber-200',  dot: 'bg-amber-500',  step: 2 },
  'Đã chốt yêu cầu':{ color: 'bg-red-100 text-red-700 border-red-200',        dot: 'bg-red-500',    step: 3 },
  'Đang Code':       { color: 'bg-green-100 text-green-700 border-green-200',  dot: 'bg-green-500',  step: 4 },
};

const EMPTY_FORM = { name: '', description: '', stakeholders: '' };

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const { user } = useAuth();
  const router = useRouter();

  const fetchProjects = async () => {
    const res = await fetch('/api/projects');
    setProjects(await res.json());
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const stakeArr = form.stakeholders.split(',').map(s => s.trim()).filter(Boolean);
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, description: form.description, stakeholders: stakeArr }),
    });
    setForm(EMPTY_FORM); setShowForm(false); setLoading(false);
    fetchProjects();
  };

  const canCreate = !user || user.role === 'admin' || user.role === 'ba';

  const filtered = projects.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const groupedByStatus = Object.entries(
    filtered.reduce((acc, p) => { (acc[p.status] = acc[p.status] || []).push(p); return acc; }, {} as Record<string, Project[]>)
  );

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Quản lý Dự án</h1>
            <p className="text-sm text-slate-500 mt-0.5">{projects.length} dự án · {projects.filter(p => p.is_locked).length} đã Freeze</p>
          </div>
          {canCreate && (
            <button onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-2">
              + Tạo dự án mới
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-5">
          <div className="relative flex-1 max-w-xs">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm kiếm dự án..."
              className="w-full border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
            <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1">
            {['all', ...Object.keys(STATUS_META)].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  filterStatus === s ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                }`}>
                {s === 'all' ? 'Tất cả' : s}
              </button>
            ))}
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
            <div className="text-5xl mb-4">📁</div>
            <p className="font-semibold text-slate-600 mb-2 text-lg">
              {projects.length === 0 ? 'Chưa có dự án nào' : 'Không tìm thấy kết quả'}
            </p>
            <p className="text-slate-400 text-sm mb-6">
              {projects.length === 0
                ? 'Bắt đầu bằng cách tạo dự án đầu tiên để khảo sát và phân tích nghiệp vụ.'
                : 'Thử thay đổi điều kiện tìm kiếm.'}
            </p>
            {canCreate && projects.length === 0 && (
              <button onClick={() => setShowForm(true)}
                className="bg-blue-600 text-white font-semibold px-6 py-2.5 rounded-lg text-sm">
                Tạo dự án đầu tiên
              </button>
            )}
          </div>
        )}

        {/* Project grid */}
        <div className="space-y-6">
          {groupedByStatus.map(([status, projs]) => (
            <div key={status}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_META[status]?.color || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                  {status}
                </span>
                <span className="text-xs text-slate-400">{projs.length} dự án</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projs.map(project => <ProjectCard key={project.id} project={project} />)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">Tạo Dự án Khảo sát mới</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-2xl">×</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Tên dự án / Quy trình cần khảo sát <span className="text-red-500">*</span>
                </label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="VD: Hệ thống So sánh Báo giá NCC — Module Thu mua"
                  required className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mô tả ngắn</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Bài toán cần giải quyết là gì? Phạm vi khảo sát?"
                  rows={3} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Stakeholders <span className="text-slate-400 font-normal">(phân cách bằng dấu phẩy)</span>
                </label>
                <input type="text" value={form.stakeholders} onChange={e => setForm(f => ({ ...f, stakeholders: e.target.value }))}
                  placeholder="Trần Thị Hoa - Thu mua, Nguyễn Văn An - Kế toán, CEO Dững"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50">Hủy</button>
                <button type="submit" disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-bold disabled:opacity-50">
                  {loading ? 'Đang tạo...' : '+ Tạo dự án'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const meta = STATUS_META[project.status] || STATUS_META['Khởi tạo'];
  const stakes = JSON.parse(project.stakeholders || '[]') as string[];
  const stepPct = (meta.step / 4) * 100;

  return (
    <Link href={`/projects/${project.id}`}
      className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-bold text-slate-800 text-sm leading-snug group-hover:text-blue-700 transition-colors flex-1 pr-2 line-clamp-2">
          {project.name}
        </h3>
        {project.is_locked === 1 && (
          <span className="text-xs bg-red-50 text-red-500 border border-red-200 px-1.5 py-0.5 rounded-full font-semibold shrink-0">🔒</span>
        )}
      </div>

      {project.description && (
        <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">{project.description}</p>
      )}

      {/* Status */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`inline-flex items-center gap-1 text-xs border px-2 py-0.5 rounded-full font-semibold ${meta.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`}></span>
          {project.status}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-400">Tiến độ</span>
          <span className="text-xs font-semibold text-slate-600">{meta.step}/4 bước</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${stepPct}%` }} />
        </div>
      </div>

      {/* Stakeholders */}
      {stakes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {stakes.slice(0, 2).map((s, i) => (
            <span key={i} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full truncate max-w-[100px]" title={s}>{s}</span>
          ))}
          {stakes.length > 2 && (
            <span className="text-xs text-slate-400">+{stakes.length - 2}</span>
          )}
        </div>
      )}
    </Link>
  );
}

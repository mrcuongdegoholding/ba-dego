import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 bg-blue-600 text-white px-5 py-2 rounded-full text-sm font-semibold mb-6 tracking-wide">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            DEGO Holding — Internal Tool
          </div>
          <h1 className="text-5xl font-bold text-white mb-3">DX-BA Hub</h1>
          <p className="text-slate-400 text-lg">Hệ thống Quản lý Khảo sát &amp; Phân tích Nghiệp vụ nội bộ</p>
        </div>

        {/* Rule box */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 mb-8">
          <div className="flex items-start gap-3">
            <span className="text-amber-400 text-xl mt-0.5">⚡</span>
            <div>
              <p className="font-bold text-amber-300 mb-1">Quy tắc bất di bất dịch: No System, No Code</p>
              <p className="text-amber-200/70 text-sm">Cường và Bảo tuyệt đối không nhận task qua Zalo. Mọi yêu cầu phải có User Story + Acceptance Criteria đã được phê duyệt trong hệ thống.</p>
            </div>
          </div>
        </div>

        {/* Flow */}
        <div className="bg-slate-800 rounded-xl p-5 mb-8">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Luồng làm việc bắt buộc (One-way Workflow)</p>
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { icon: '📋', label: 'Tạo Dự án', sub: 'PM + Stakeholders' },
              { icon: '📝', label: 'Khảo sát 3 bước', sub: 'BA chủ trì' },
              { icon: '🔍', label: 'Phân tích 5W1H', sub: 'BA + Tech' },
              { icon: '📌', label: 'Product Backlog', sub: 'Dev nhận task' },
              { icon: '🔒', label: 'Sign-off & Freeze', sub: 'PM chốt' },
            ].map((step, i, arr) => (
              <div key={i} className="flex items-center gap-2">
                <div className="bg-slate-700 rounded-lg px-3 py-2 text-center min-w-[110px]">
                  <div className="text-lg mb-0.5">{step.icon}</div>
                  <div className="text-white text-xs font-semibold">{step.label}</div>
                  <div className="text-slate-400 text-xs">{step.sub}</div>
                </div>
                {i < arr.length - 1 && <span className="text-slate-500 text-lg">→</span>}
              </div>
            ))}
          </div>
        </div>

        <Link href="/projects"
          className="block w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl text-center text-lg">
          Vào hệ thống →
        </Link>

        <div className="flex justify-center gap-6 mt-6 text-slate-500 text-xs">
          <span>👥 Team: Phú (PM) · Giang (BA) · Cường (Tech) · Bảo (Dev)</span>
          <span>📅 Sprint: 14 ngày</span>
        </div>
      </div>
    </div>
  );
}

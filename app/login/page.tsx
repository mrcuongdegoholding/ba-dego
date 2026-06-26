'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, ROLE_LABELS, ROLE_COLORS } from '@/lib/auth-context';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const router = useRouter();

  useEffect(() => { if (user) router.replace('/projects'); }, [user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    const result = await login(username, password);
    setLoading(false);
    if (result.ok) router.push('/projects');
    else setError(result.error || 'Đăng nhập thất bại');
  };

  const DEMO_USERS = [
    { username: 'giang',  password: 'giang123', role: 'ba'      as const },
    { username: 'dung',   password: 'ceo2024',  role: 'manager' as const },
    { username: 'cuong',  password: 'cuong123', role: 'dev'     as const },
    { username: 'admin',  password: 'dego2024', role: 'admin'   as const },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg mb-4">
            <span className="text-white text-xl font-bold">DX</span>
          </div>
          <h1 className="text-white text-2xl font-bold">DX-BA Hub</h1>
          <p className="text-slate-400 text-sm mt-1">DEGO Holding — Hệ thống Quản lý Nghiệp vụ</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <h2 className="font-bold text-slate-800 text-lg mb-5">Đăng nhập</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tên đăng nhập</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="VD: giang" required autoFocus
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mật khẩu</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu" required
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-sm disabled:opacity-50 transition-colors">
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-5 pt-5 border-t border-slate-100">
            <div className="text-xs text-slate-400 font-semibold mb-2.5 uppercase tracking-wide">Tài khoản demo (click để điền nhanh)</div>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_USERS.map(u => (
                <button key={u.username}
                  onClick={() => { setUsername(u.username); setPassword(u.password); }}
                  className="text-left p-2 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors">
                  <div className={`text-xs px-1.5 py-0.5 rounded-full font-semibold inline-block mb-0.5 ${ROLE_COLORS[u.role]}`}>
                    {ROLE_LABELS[u.role]}
                  </div>
                  <div className="text-sm font-semibold text-slate-700">{u.username}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-slate-500 text-xs mt-4">
          Team DX — DEGO Holding · Nội bộ
        </p>
      </div>
    </div>
  );
}

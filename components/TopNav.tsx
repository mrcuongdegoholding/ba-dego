'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, ROLE_COLORS, ROLE_LABELS } from '@/lib/auth-context';
import { useState } from 'react';

export default function TopNav() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [showUser, setShowUser] = useState(false);

  // Hide nav on login page
  if (pathname === '/login') return null;

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navItems = [
    { href: '/projects', label: 'Dự án', icon: '📁' },
    { href: '/reports', label: 'Báo cáo & Thống kê', icon: '📊' },
    ...(user?.role === 'admin' ? [{ href: '/admin', label: 'Quản trị', icon: '⚙️' }] : []),
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 shadow-sm h-14 flex items-center px-4 gap-4 no-print">
      {/* Logo */}
      <Link href="/projects" className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">DX</div>
        <div className="font-bold text-slate-800 text-sm leading-tight">
          <span className="text-blue-600">BA</span>{' '}Hub
          <span className="block text-xs text-slate-400 font-normal leading-none">DEGO Holding</span>
        </div>
      </Link>

      {/* Divider */}
      <div className="w-px h-6 bg-slate-200" />

      {/* Navigation */}
      <nav className="flex items-center gap-1">
        {navItems.map(item => {
          const active = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
              }`}>
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      {/* User area */}
      {user ? (
        <div className="relative">
          <button onClick={() => setShowUser(v => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
              {user.full_name.charAt(0)}
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold text-slate-800 leading-tight">{user.full_name}</div>
              <div className={`text-xs px-1.5 py-0 rounded-full font-medium ${ROLE_COLORS[user.role]}`}>
                {ROLE_LABELS[user.role]}
              </div>
            </div>
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showUser && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-1 animate-fade-in z-50">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <div className="font-semibold text-slate-800 text-sm">{user.full_name}</div>
                <div className="text-xs text-slate-400">{user.username}</div>
              </div>
              <button onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      ) : (
        <Link href="/login"
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-1.5 rounded-lg">
          Đăng nhập
        </Link>
      )}
    </header>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { useAuth, ROLE_LABELS, ROLE_COLORS } from '@/lib/auth-context';
import type { User, UserRole } from '@/lib/types';
import AISettingsPanel from '@/components/AISettingsPanel';

const ROLES: UserRole[] = ['admin', 'manager', 'ba', 'dev'];

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'ai'>('users');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: '', password_text: '', full_name: '', role: 'ba' as UserRole });
  const [error, setError] = useState('');

  const fetchUsers = () => fetch('/api/auth/users').then(r => r.json()).then(setUsers);
  useEffect(() => { fetchUsers(); }, []);

  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        <div className="text-center">
          <div className="text-4xl mb-3">🔒</div>
          <div className="font-semibold">Trang này chỉ dành cho Admin</div>
        </div>
      </div>
    );
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/auth/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!res.ok) { setError((await res.json()).error); return; }
    setForm({ username: '', password_text: '', full_name: '', role: 'ba' });
    setShowForm(false);
    fetchUsers();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Quản trị hệ thống</h1>
            <p className="text-sm text-slate-500 mt-0.5">Quản lý tài khoản, phân quyền và cấu hình AI</p>
          </div>
          {activeTab === 'users' && (
            <button onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">
              + Thêm người dùng
            </button>
          )}
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1 w-fit mb-5">
          {([['users', '👥 Người dùng'], ['ai', '✨ Cấu hình AI']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeTab === key ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'ai' && <AISettingsPanel updatedBy={currentUser?.full_name || 'Admin'} />}

        {activeTab === 'users' && <>
        {/* Roles legend */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Phân quyền hệ thống</div>
          <div className="grid grid-cols-4 gap-3">
            {([
              { role: 'admin' as UserRole, desc: 'Toàn quyền: Quản lý user, xem tất cả dự án, cấu hình hệ thống' },
              { role: 'manager' as UserRole, desc: 'CEO/Quản lý: Xem báo cáo, duyệt Change Request, Freeze dự án' },
              { role: 'ba' as UserRole, desc: 'BA: Tạo/sửa dự án, nhập khảo sát, phân tích, tạo Backlog' },
              { role: 'dev' as UserRole, desc: 'Dev: Xem yêu cầu, cập nhật trạng thái task' },
            ]).map(item => (
              <div key={item.role} className="rounded-lg border border-slate-100 p-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[item.role]}`}>
                  {ROLE_LABELS[item.role]}
                </span>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Users table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-500 font-semibold">Họ tên</th>
                <th className="text-left px-4 py-3 text-slate-500 font-semibold">Username</th>
                <th className="text-left px-4 py-3 text-slate-500 font-semibold">Vai trò</th>
                <th className="text-left px-4 py-3 text-slate-500 font-semibold">Trạng thái</th>
                <th className="text-left px-4 py-3 text-slate-500 font-semibold">Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {u.full_name.charAt(0)}
                      </div>
                      <span className="font-medium text-slate-800">{u.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-500 text-xs">{u.username}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role as UserRole]}`}>
                      {ROLE_LABELS[u.role as UserRole]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {u.is_active ? '● Hoạt động' : '○ Đã khóa'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{u.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add user modal */}
        </>}

        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h2 className="font-bold text-slate-900">Thêm người dùng mới</h2>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-2xl">×</button>
              </div>
              <form onSubmit={handleAdd} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Họ tên đầy đủ <span className="text-red-500">*</span></label>
                  <input type="text" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tên đăng nhập <span className="text-red-500">*</span></label>
                  <input type="text" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase() }))} required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mật khẩu <span className="text-red-500">*</span></label>
                  <input type="text" value={form.password_text} onChange={e => setForm(f => ({ ...f, password_text: e.target.value }))} required
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Vai trò</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </div>
                {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50">Hủy</button>
                  <button type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-bold">Tạo tài khoản</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

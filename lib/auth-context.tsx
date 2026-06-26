'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { UserRole } from './types';

export interface AuthUser {
  id: number;
  username: string;
  full_name: string;
  role: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => ({ ok: false }),
  logout: async () => {},
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Hydrate from the httpOnly session cookie via /api/auth/me.
    fetch('/api/auth/me')
      .then(r => (r.ok ? r.json() : null))
      .then((data) => { if (data && data.id) setUser(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error };
    setUser({ id: data.id, username: data.username, full_name: data.full_name, role: data.role });
    return { ok: true };
  };

  const logout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, logout, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin:   'Quản trị viên',
  ba:      'BA (Business Analyst)',
  dev:     'Developer',
  manager: 'Quản lý / CEO',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  admin:   'bg-red-100 text-red-700',
  ba:      'bg-blue-100 text-blue-700',
  dev:     'bg-green-100 text-green-700',
  manager: 'bg-purple-100 text-purple-700',
};

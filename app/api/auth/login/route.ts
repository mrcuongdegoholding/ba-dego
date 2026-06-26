import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/jwt';
import type { UserRole } from '@/lib/types';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  if (!username || !password) return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 });

  const db = getDb();
  const user = await db.prepare(
    `SELECT id, username, full_name, role, is_active, password_hash, password_text
       FROM users WHERE username = ?`
  ).get(username.trim().toLowerCase()) as
    | { id: number; username: string; full_name: string; role: UserRole; is_active: number; password_hash: string; password_text: string }
    | undefined;

  if (!user) return NextResponse.json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' }, { status: 401 });
  if (!user.is_active) return NextResponse.json({ error: 'Tài khoản đã bị khóa. Liên hệ Admin.' }, { status: 403 });

  // Prefer hash; fall back to legacy plaintext once, then upgrade to hash.
  let ok = false;
  if (user.password_hash) {
    ok = bcrypt.compareSync(password, user.password_hash);
  } else if (user.password_text) {
    ok = password === user.password_text;
    if (ok) {
      await db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(bcrypt.hashSync(password, 10), user.id);
    }
  }
  if (!ok) return NextResponse.json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' }, { status: 401 });

  const token = await signSession({ id: user.id, username: user.username, full_name: user.full_name, role: user.role });

  const res = NextResponse.json({ id: user.id, username: user.username, full_name: user.full_name, role: user.role });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}

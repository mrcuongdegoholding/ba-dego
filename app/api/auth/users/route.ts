import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { requireRole, isAuthError } from '@/lib/auth-server';
import { canManageUsers } from '@/lib/permissions';

export async function GET() {
  const guard = await requireRole(r => canManageUsers({ role: r }));
  if (isAuthError(guard)) return guard;

  const db = getDb();
  const users = await db.prepare(`SELECT id, username, full_name, role, is_active, created_at FROM users ORDER BY role, full_name`).all();
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const guard = await requireRole(r => canManageUsers({ role: r }));
  if (isAuthError(guard)) return guard;

  const body = await req.json();
  const { username, password_text, full_name, role } = body;
  if (!username || !password_text || !full_name || !role) {
    return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
  }
  const db = getDb();
  try {
    // Store only the bcrypt hash; never persist the raw password.
    const hash = bcrypt.hashSync(password_text, 10);
    const result = await db.prepare(
      `INSERT INTO users (username, password_text, password_hash, full_name, role) VALUES (?, '', ?, ?, ?)`
    ).run(username.trim().toLowerCase(), hash, full_name, role);
    return NextResponse.json({ id: result.lastInsertRowid });
  } catch {
    return NextResponse.json({ error: 'Tên đăng nhập đã tồn tại' }, { status: 409 });
  }
}

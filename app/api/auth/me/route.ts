import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-server';

export async function GET() {
  const u = await getCurrentUser();
  if (!u) return NextResponse.json({ error: 'Chưa xác thực' }, { status: 401 });

  const db = getDb();
  const full = await db.prepare(`SELECT id, username, full_name, role FROM users WHERE id = ?`).get(u.id);
  if (!full) return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 401 });
  return NextResponse.json(full);
}

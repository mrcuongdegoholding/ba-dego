import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const project = await db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  if (!project) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
  return NextResponse.json(project);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const body = await req.json();

  const project = await db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as { is_locked: number } | undefined;
  if (!project) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

  const allowedFields = ['name', 'description', 'status', 'stakeholders', 'is_locked'];
  const updates = Object.entries(body).filter(([k]) => allowedFields.includes(k));
  if (updates.length === 0) return NextResponse.json({ error: 'Không có trường nào để cập nhật' }, { status: 400 });

  const setClauses = updates.map(([k]) => `${k} = ?`).join(', ');
  const values = updates.map(([, v]) => (typeof v === 'object' ? JSON.stringify(v) : v));
  await db.prepare(`UPDATE projects SET ${setClauses}, updated_at = datetime('now','localtime') WHERE id = ?`).run(...values, id);

  const updated = await db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  await db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}

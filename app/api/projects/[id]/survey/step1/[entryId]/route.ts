import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string; entryId: string }> }) {
  const { entryId } = await params;
  const db = getDb();
  await db.prepare('DELETE FROM survey_step1 WHERE id = ?').run(entryId);
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; entryId: string }> }) {
  const { entryId } = await params;
  const db = getDb();
  const body = await req.json();
  const allowed = ['process_name', 'department', 'role', 'frequency', 'current_tools', 'process_steps', 'input_documents', 'output_documents', 'pain_points', 'notes'];
  const updates = Object.entries(body).filter(([k]) => allowed.includes(k));
  if (!updates.length) return NextResponse.json({ error: 'Không có trường nào' }, { status: 400 });
  const setClauses = updates.map(([k]) => `${k} = ?`).join(', ');
  const values = updates.map(([, v]) => Array.isArray(v) ? JSON.stringify(v) : v);
  await db.prepare(`UPDATE survey_step1 SET ${setClauses} WHERE id = ?`).run(...values, entryId);
  return NextResponse.json(await db.prepare('SELECT * FROM survey_step1 WHERE id = ?').get(entryId));
}

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const rows = await db.prepare('SELECT * FROM product_backlog WHERE project_id = ? ORDER BY priority ASC, created_at ASC').all(id);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const project = await db.prepare('SELECT is_locked FROM projects WHERE id = ?').get(id) as { is_locked: number } | undefined;
  if (!project) return NextResponse.json({ error: 'Dự án không tồn tại' }, { status: 404 });
  if (project.is_locked) return NextResponse.json({ error: 'Dự án đã được Freeze. Dùng Change Request để thêm task mới.' }, { status: 403 });

  const body = await req.json();
  const { user_story, acceptance_criteria, priority, analysis_id, epic_group } = body;
  if (!user_story) return NextResponse.json({ error: 'User story là bắt buộc' }, { status: 400 });

  const result = await db.prepare(
    `INSERT INTO product_backlog (project_id, analysis_id, user_story, acceptance_criteria, priority, epic_group, status)
     VALUES (?, ?, ?, ?, ?, ?, 'To Do')`
  ).run(id, analysis_id || null, user_story, acceptance_criteria || '', priority || 'P1-High', epic_group || '');

  const row = await db.prepare('SELECT * FROM product_backlog WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(row, { status: 201 });
}

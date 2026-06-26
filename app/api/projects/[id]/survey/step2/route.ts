import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  return NextResponse.json(await db.prepare('SELECT * FROM survey_step2 WHERE project_id = ? ORDER BY created_at ASC').all(id));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const body = await req.json();
  const { question, answer, category, is_pain_point, follow_up, step1_id, created_by } = body;
  if (!question || !answer) return NextResponse.json({ error: 'Câu hỏi và câu trả lời là bắt buộc' }, { status: 400 });

  const result = await db.prepare(`
    INSERT INTO survey_step2 (project_id, step1_id, question, answer, category, is_pain_point, follow_up, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, step1_id || null, question, answer, category || 'normal', is_pain_point ? 1 : 0, follow_up || '', created_by || 'Giang (BA)');

  return NextResponse.json(await db.prepare('SELECT * FROM survey_step2 WHERE id = ?').get(result.lastInsertRowid), { status: 201 });
}

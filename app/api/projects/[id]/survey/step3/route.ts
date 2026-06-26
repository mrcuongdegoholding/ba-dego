import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  return NextResponse.json(await db.prepare('SELECT * FROM survey_step3 WHERE project_id = ? ORDER BY created_at ASC').all(id));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const body = await req.json();
  const { observation, action_type, duration_minutes, frequency, automation_potential, is_pain_point, hidden_requirement, step1_id, created_by } = body;
  if (!observation) return NextResponse.json({ error: 'Mô tả quan sát là bắt buộc' }, { status: 400 });

  const result = await db.prepare(`
    INSERT INTO survey_step3 (project_id, step1_id, observation, action_type, duration_minutes, frequency, automation_potential, is_pain_point, hidden_requirement, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, step1_id || null, observation, action_type || 'redundant', duration_minutes || 0, frequency || '', automation_potential || 'medium', is_pain_point ? 1 : 0, hidden_requirement || '', created_by || 'Giang (BA)');

  return NextResponse.json(await db.prepare('SELECT * FROM survey_step3 WHERE id = ?').get(result.lastInsertRowid), { status: 201 });
}

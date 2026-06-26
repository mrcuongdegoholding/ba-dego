import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; analysisId: string }> }) {
  const { analysisId } = await params;
  const db = getDb();
  const body = await req.json();
  const allowed = ['business_flow', 'what', 'who', 'where_field', 'when_field', 'why', 'how_edge_cases', 'source_step1_ids', 'source_step2_ids', 'source_step3_ids'];
  const updates = Object.entries(body).filter(([k]) => allowed.includes(k));
  if (!updates.length) return NextResponse.json({ error: 'Không có trường nào' }, { status: 400 });
  const setClauses = updates.map(([k]) => `${k} = ?`).join(', ');
  const values = updates.map(([, v]) => Array.isArray(v) ? JSON.stringify(v) : v);
  await db.prepare(`UPDATE analysis_5w1h SET ${setClauses} WHERE id = ?`).run(...values, analysisId);
  return NextResponse.json(await db.prepare('SELECT * FROM analysis_5w1h WHERE id = ?').get(analysisId));
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string; analysisId: string }> }) {
  const { analysisId } = await params;
  await getDb().prepare('DELETE FROM analysis_5w1h WHERE id = ?').run(analysisId);
  return NextResponse.json({ success: true });
}

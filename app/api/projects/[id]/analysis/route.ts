import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  return NextResponse.json(await db.prepare('SELECT * FROM analysis_5w1h WHERE project_id = ? ORDER BY created_at ASC').all(id));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const body = await req.json();
  const { business_flow, what, who, where_field, when_field, why, how_edge_cases, source_step1_ids, source_step2_ids, source_step3_ids } = body;

  if (!business_flow) return NextResponse.json({ error: 'Tên luồng nghiệp vụ là bắt buộc' }, { status: 400 });
  if (!how_edge_cases) return NextResponse.json({ error: 'Ngoại lệ (How/Edge cases) là bắt buộc' }, { status: 400 });

  const result = await db.prepare(`
    INSERT INTO analysis_5w1h (project_id, business_flow, what, who, where_field, when_field, why, how_edge_cases, source_step1_ids, source_step2_ids, source_step3_ids)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, business_flow, what || '', who || '', where_field || '', when_field || '', why || '', how_edge_cases,
    JSON.stringify(source_step1_ids || []),
    JSON.stringify(source_step2_ids || []),
    JSON.stringify(source_step3_ids || [])
  );

  await db.prepare(`UPDATE projects SET status = 'Đang phân tích', updated_at = datetime('now','localtime') WHERE id = ? AND status = 'Đang khảo sát'`).run(id);
  return NextResponse.json(await db.prepare('SELECT * FROM analysis_5w1h WHERE id = ?').get(result.lastInsertRowid), { status: 201 });
}

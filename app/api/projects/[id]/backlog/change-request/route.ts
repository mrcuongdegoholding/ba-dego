import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const project = await db.prepare('SELECT is_locked FROM projects WHERE id = ?').get(id) as { is_locked: number } | undefined;
  if (!project) return NextResponse.json({ error: 'Dự án không tồn tại' }, { status: 404 });
  if (!project.is_locked) return NextResponse.json({ error: 'Dự án chưa Freeze. Dùng luồng thông thường để thêm task.' }, { status: 400 });

  const body = await req.json();
  const { user_story, acceptance_criteria, priority, cr_reason, cr_impact, cr_manhours } = body;

  if (!user_story) return NextResponse.json({ error: 'User story là bắt buộc' }, { status: 400 });
  if (!cr_reason) return NextResponse.json({ error: 'Lý do Change Request là bắt buộc' }, { status: 400 });
  if (!cr_impact) return NextResponse.json({ error: 'Tác động đến code cũ là bắt buộc' }, { status: 400 });
  if (!cr_manhours) return NextResponse.json({ error: 'Số giờ dev dự kiến là bắt buộc' }, { status: 400 });

  const result = await db.prepare(
    `INSERT INTO product_backlog (project_id, user_story, acceptance_criteria, priority, is_change_request, cr_reason, cr_impact, cr_manhours, cr_approved)
     VALUES (?, ?, ?, ?, 1, ?, ?, ?, 0)`
  ).run(id, user_story, acceptance_criteria || '', priority || 'P1-High', cr_reason, cr_impact, cr_manhours);

  const row = await db.prepare('SELECT * FROM product_backlog WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(row, { status: 201 });
}

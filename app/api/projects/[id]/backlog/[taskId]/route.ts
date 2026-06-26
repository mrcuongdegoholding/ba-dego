import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const { id, taskId } = await params;
  const db = getDb();
  const body = await req.json();

  const allowed = ['user_story', 'acceptance_criteria', 'priority', 'status', 'is_locked', 'cr_reason', 'cr_impact', 'cr_manhours', 'cr_approved', 'version', 'epic_group'];
  const updates = Object.entries(body).filter(([k]) => allowed.includes(k));
  if (updates.length === 0) return NextResponse.json({ error: 'Không có trường nào' }, { status: 400 });

  const setClauses = updates.map(([k]) => `${k} = ?`).join(', ');
  const values = updates.map(([, v]) => v);
  await db.prepare(`UPDATE product_backlog SET ${setClauses}, updated_at = datetime('now','localtime') WHERE id = ?`).run(...values, taskId);

  // Audit the meaningful lifecycle transitions.
  if ('cr_approved' in body) {
    await logAudit({ action: body.cr_approved ? 'APPROVE_CR' : 'REJECT_CR', entityType: 'backlog', entityId: parseInt(taskId), projectId: parseInt(id) });
  } else if (body.is_locked === 1) {
    await logAudit({ action: 'LOCK_BACKLOG', entityType: 'backlog', entityId: parseInt(taskId), projectId: parseInt(id) });
  }

  const row = await db.prepare('SELECT * FROM product_backlog WHERE id = ?').get(taskId);
  return NextResponse.json(row);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const { taskId } = await params;
  const db = getDb();
  const task = await db.prepare('SELECT is_locked FROM product_backlog WHERE id = ?').get(taskId) as { is_locked: number } | undefined;
  if (task?.is_locked) return NextResponse.json({ error: 'Task đã bị khóa, không thể xóa' }, { status: 403 });
  await db.prepare('DELETE FROM product_backlog WHERE id = ?').run(taskId);
  return NextResponse.json({ success: true });
}

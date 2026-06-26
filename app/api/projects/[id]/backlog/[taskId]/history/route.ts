import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logAudit } from '@/lib/audit';

type Params = { params: Promise<{ id: string; taskId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id, taskId } = await params;
  const db = getDb();
  const rows = await db.prepare(
    `SELECT * FROM backlog_history WHERE project_id=? AND backlog_id=? ORDER BY id DESC`
  ).all(parseInt(id), parseInt(taskId));
  return NextResponse.json(rows);
}

// POST: save current version to history, then bump version
export async function POST(req: NextRequest, { params }: Params) {
  const { id, taskId } = await params;
  const body = await req.json();
  const { cr_reason, cr_impact, changed_by } = body;

  if (!cr_reason) return NextResponse.json({ error: 'cr_reason required' }, { status: 400 });

  const db = getDb();
  const task = await db.prepare(`SELECT * FROM product_backlog WHERE id=? AND project_id=?`)
    .get(parseInt(taskId), parseInt(id)) as Record<string, unknown> | undefined;
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Parse current version and bump it
  const currentVersion = (task.version as string) || 'v1.0';
  const match = currentVersion.match(/^v(\d+)\.(\d+)$/);
  let nextVersion = 'v1.1';
  if (match) {
    nextVersion = `v${match[1]}.${parseInt(match[2]) + 1}`;
  }

  // Save snapshot to history
  await db.prepare(`
    INSERT INTO backlog_history (backlog_id, project_id, version, user_story, acceptance_criteria, priority, cr_reason, cr_impact, changed_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    task.id, parseInt(id), currentVersion,
    task.user_story, task.acceptance_criteria, task.priority,
    cr_reason, cr_impact || '', changed_by || ''
  );

  // Unlock and bump version
  await db.prepare(`
    UPDATE product_backlog SET is_locked=0, version=?, updated_at=datetime('now','localtime') WHERE id=?
  `).run(nextVersion, task.id);

  await logAudit({
    action: 'UNLOCK_BACKLOG', entityType: 'backlog', entityId: Number(task.id), projectId: parseInt(id),
    detail: `${currentVersion} → ${nextVersion}: ${cr_reason}`,
  });

  return NextResponse.json({ ok: true, version: nextVersion });
}

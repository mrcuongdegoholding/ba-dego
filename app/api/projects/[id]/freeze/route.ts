import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireRole, isAuthError } from '@/lib/auth-server';
import { canFreeze } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole(r => canFreeze({ role: r }));
  if (isAuthError(guard)) return guard;

  const { id } = await params;
  const db = getDb();
  let epicGroup: string | undefined;
  try {
    const body = await req.json();
    epicGroup = body.epic_group;
  } catch (e) {
    // ignore
  }

  const project = await db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as { is_locked: number } | undefined;
  if (!project) return NextResponse.json({ error: 'Dự án không tồn tại' }, { status: 404 });
  if (project.is_locked && !epicGroup) return NextResponse.json({ error: 'Dự án đã bị Freeze rồi' }, { status: 400 });

  if (epicGroup) {
    // Lock all backlog items in this Epic
    await db.prepare('UPDATE product_backlog SET is_locked = 1 WHERE project_id = ? AND epic_group = ? AND is_change_request = 0').run(id, epicGroup);
    await logAudit({ action: 'FREEZE_EPIC', entityType: 'backlog', entityId: parseInt(id), projectId: parseInt(id), detail: `Khóa Epic: ${epicGroup}` });
  } else {
    // Lock all backlog items
    await db.prepare('UPDATE product_backlog SET is_locked = 1 WHERE project_id = ? AND is_change_request = 0').run(id);
    // Lock project
    await db.prepare(`UPDATE projects SET is_locked = 1, status = 'Đã chốt yêu cầu', updated_at = datetime('now','localtime') WHERE id = ?`).run(id);
    await logAudit({ action: 'FREEZE_PROJECT', entityType: 'project', entityId: parseInt(id), projectId: parseInt(id), detail: 'Chốt yêu cầu & khóa toàn bộ backlog' });
  }

  const updated = await db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  return NextResponse.json(updated);
}

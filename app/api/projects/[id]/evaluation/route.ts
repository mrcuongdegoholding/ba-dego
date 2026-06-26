import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET /api/projects/[id]/evaluation?entity_type=backlog&entity_id=5
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const entity_type = searchParams.get('entity_type');
  const entity_id = searchParams.get('entity_id');

  const db = getDb();
  let query = `SELECT * FROM evaluation_checks WHERE project_id = ?`;
  const args: (string | number)[] = [parseInt(id)];

  if (entity_type) { query += ` AND entity_type = ?`; args.push(entity_type); }
  if (entity_id !== null) { query += ` AND entity_id = ?`; args.push(parseInt(entity_id)); }

  const checks = await db.prepare(query).all(...args);
  return NextResponse.json(checks);
}

// POST /api/projects/[id]/evaluation  — toggle a checklist item
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { entity_type, entity_id, criterion_group, item_key, checked, note, updated_by } = body;

  if (!entity_type || !criterion_group || !item_key) {
    return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 });
  }

  const db = getDb();
  const projectId = parseInt(id);
  const entityId = entity_id ?? null;

  await db.prepare(`
    INSERT INTO evaluation_checks (project_id, entity_type, entity_id, criterion_group, item_key, checked, note, updated_by, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'))
    ON CONFLICT(project_id, entity_type, entity_id, criterion_group, item_key)
    DO UPDATE SET checked = excluded.checked, note = excluded.note, updated_by = excluded.updated_by, updated_at = excluded.updated_at
  `).run(projectId, entity_type, entityId, criterion_group, item_key, checked ? 1 : 0, note ?? '', updated_by ?? '');

  return NextResponse.json({ ok: true });
}

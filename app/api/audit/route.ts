import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireRole, isAuthError } from '@/lib/auth-server';
import { canManageUsers } from '@/lib/permissions';

export async function GET(req: NextRequest) {
  const guard = await requireRole(r => canManageUsers({ role: r }));
  if (isAuthError(guard)) return guard;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
  const action = searchParams.get('action') || '';

  const db = getDb();
  const where = action ? 'WHERE a.action = ?' : '';
  const rows = await db.prepare(
    `SELECT a.*, p.name as project_name
       FROM audit_log a LEFT JOIN projects p ON p.id = a.project_id
       ${where}
       ORDER BY a.id DESC LIMIT ?`
  ).all(...(action ? [action, limit] : [limit]));
  return NextResponse.json(rows);
}

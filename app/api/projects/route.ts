import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireRole, isAuthError } from '@/lib/auth-server';
import { canManageProjects } from '@/lib/permissions';

export async function GET() {
  const db = getDb();
  const projects = await db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const guard = await requireRole(r => canManageProjects({ role: r }));
  if (isAuthError(guard)) return guard;

  const db = getDb();
  const body = await req.json();
  const { name, description, stakeholders } = body;
  if (!name) return NextResponse.json({ error: 'Tên dự án không được trống' }, { status: 400 });

  const result = await db.prepare(
    'INSERT INTO projects (name, description, stakeholders) VALUES (?, ?, ?)'
  ).run(name, description || '', JSON.stringify(stakeholders || []));

  const project = await db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(project, { status: 201 });
}

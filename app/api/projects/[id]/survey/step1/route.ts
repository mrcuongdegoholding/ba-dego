import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const rows = await db.prepare('SELECT * FROM survey_step1 WHERE project_id = ? ORDER BY created_at ASC').all(id);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const body = await req.json();

  const { process_name, department, role, frequency, current_tools, process_steps, input_documents, output_documents, pain_points, notes, created_by } = body;
  if (!process_name || !department || !role) {
    return NextResponse.json({ error: 'Tên quy trình, phòng ban và vai trò là bắt buộc' }, { status: 400 });
  }

  const result = await db.prepare(`
    INSERT INTO survey_step1 (project_id, process_name, department, role, frequency, current_tools, process_steps, input_documents, output_documents, pain_points, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, process_name, department, role, frequency || '',
    JSON.stringify(current_tools || []),
    JSON.stringify(process_steps || []),
    JSON.stringify(input_documents || []),
    JSON.stringify(output_documents || []),
    JSON.stringify(pain_points || []),
    notes || '', created_by || 'Giang (BA)'
  );

  const row = await db.prepare('SELECT * FROM survey_step1 WHERE id = ?').get(result.lastInsertRowid);
  // Update project status
  await db.prepare(`UPDATE projects SET status = 'Đang khảo sát', updated_at = datetime('now','localtime') WHERE id = ? AND status = 'Khởi tạo'`).run(id);
  return NextResponse.json(row, { status: 201 });
}

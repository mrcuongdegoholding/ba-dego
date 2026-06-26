import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// Returns aggregated survey data for linking to analysis
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const step1 = await db.prepare('SELECT * FROM survey_step1 WHERE project_id = ? ORDER BY created_at').all(id);
  const step2 = await db.prepare('SELECT * FROM survey_step2 WHERE project_id = ? ORDER BY created_at').all(id);
  const step3 = await db.prepare('SELECT * FROM survey_step3 WHERE project_id = ? ORDER BY created_at').all(id);
  return NextResponse.json({ step1, step2, step3 });
}

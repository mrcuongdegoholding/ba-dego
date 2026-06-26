import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string; entryId: string }> }) {
  const { entryId } = await params;
  await getDb().prepare('DELETE FROM survey_step3 WHERE id = ?').run(entryId);
  return NextResponse.json({ success: true });
}

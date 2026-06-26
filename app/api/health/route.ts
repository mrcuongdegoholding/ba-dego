import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  let dbStatus = 'ok';
  let aiStatus = 'no-key';
  try {
    const db = getDb();
    await db.prepare('SELECT 1').get();
    const cfg = await db.prepare(`SELECT api_key FROM ai_settings WHERE is_active=1 LIMIT 1`).get() as { api_key: string } | undefined;
    if (cfg?.api_key) aiStatus = 'configured';
  } catch {
    dbStatus = 'error';
  }
  return NextResponse.json({ status: dbStatus === 'ok' ? 'healthy' : 'degraded', db: dbStatus, ai: aiStatus });
}

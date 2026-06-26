import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireRole, isAuthError } from '@/lib/auth-server';
import { canConfigureAI } from '@/lib/permissions';
import { encryptSecret, decryptSecret } from '@/lib/crypto-utils';

export async function GET() {
  const guard = await requireRole(r => canConfigureAI({ role: r }));
  if (isAuthError(guard)) return guard;

  const db = getDb();
  const row = await db.prepare(`SELECT id, provider, model, base_url, is_active, updated_by, updated_at, api_key
    FROM ai_settings ORDER BY id DESC LIMIT 1`).get() as Record<string, unknown> | undefined;
  if (!row) return NextResponse.json(null);

  // Decrypt to compute a safe mask; never return the full key.
  const plain = decryptSecret(String(row.api_key || ''));
  const masked = plain ? '***' + plain.slice(-4) : '';
  delete row.api_key;
  return NextResponse.json({ ...row, api_key_masked: masked, key_length: plain.length });
}

export async function POST(req: NextRequest) {
  const guard = await requireRole(r => canConfigureAI({ role: r }));
  if (isAuthError(guard)) return guard;

  const body = await req.json();
  const { provider, api_key, model, base_url, updated_by } = body;
  if (!provider || !api_key) {
    return NextResponse.json({ error: 'Thiếu thông tin provider và api_key' }, { status: 400 });
  }
  const encrypted = encryptSecret(api_key);
  const db = getDb();
  const existing = await db.prepare(`SELECT id FROM ai_settings LIMIT 1`).get() as { id: number } | undefined;
  if (existing) {
    await db.prepare(`UPDATE ai_settings SET provider=?, api_key=?, model=?, base_url=?, is_active=1, updated_by=?, updated_at=datetime('now','localtime') WHERE id=?`)
      .run(provider, encrypted, model || defaultModel(provider), base_url || '', updated_by || '', existing.id);
  } else {
    await db.prepare(`INSERT INTO ai_settings (provider, api_key, model, base_url, updated_by) VALUES (?,?,?,?,?)`)
      .run(provider, encrypted, model || defaultModel(provider), base_url || '', updated_by || '');
  }
  return NextResponse.json({ ok: true });
}

function defaultModel(provider: string) {
  if (provider === 'gemini') return 'gemini-2.0-flash';
  if (provider === 'claude') return 'claude-haiku-4-5-20251001';
  return 'gpt-4o-mini';
}

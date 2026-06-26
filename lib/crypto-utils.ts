import crypto from 'crypto';

// AES-256-GCM encryption for secrets at rest (AI API keys).
// Master key from env; falls back to a dev key (rotate in production via MASTER_KEY).
const RAW_KEY = process.env.MASTER_KEY || 'dx-ba-hub-default-master-key-32b!';
// Derive a stable 32-byte key from whatever was provided.
const KEY = crypto.createHash('sha256').update(RAW_KEY).digest();
const ALGO = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

export function encryptSecret(plain: string): string {
  if (!plain) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // PREFIX + base64(iv).base64(tag).base64(cipher)
  return PREFIX + [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join('.');
}

export function decryptSecret(stored: string): string {
  if (!stored) return '';
  // Backward-compat: if the value isn't encrypted (legacy plaintext), return as-is.
  if (!stored.startsWith(PREFIX)) return stored;
  try {
    const [ivB64, tagB64, dataB64] = stored.slice(PREFIX.length).split('.');
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');
    const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch {
    return '';
  }
}

export function isEncrypted(stored: string): boolean {
  return typeof stored === 'string' && stored.startsWith(PREFIX);
}

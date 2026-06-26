import { getDb } from './db';
import { getCurrentUser } from './auth-server';

// Writes an entry to audit_log, resolving the acting user from the session headers.
export async function logAudit(opts: {
  action: string;
  entityType: string;
  entityId?: number | null;
  projectId?: number | null;
  detail?: string;
}) {
  try {
    const user = await getCurrentUser();
    const db = getDb();
    let userName = 'system';
    if (user) {
      const u = await db.prepare(`SELECT full_name FROM users WHERE id = ?`).get(user.id) as { full_name: string } | undefined;
      userName = u?.full_name || `user#${user.id}`;
    }
    await db.prepare(
      `INSERT INTO audit_log (project_id, user_name, action, entity_type, entity_id, detail)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(opts.projectId ?? null, userName, opts.action, opts.entityType, opts.entityId ?? null, opts.detail || '');
  } catch {
    // Audit must never break the main flow.
  }
}

import { SignJWT, jwtVerify } from 'jose';
import type { UserRole } from './types';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dx-ba-hub-dev-secret-change-me-in-production-2026'
);

export const SESSION_COOKIE = 'dx_ba_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  id: number;
  username: string;
  full_name: string;
  role: UserRole;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      id: payload.id as number,
      username: payload.username as string,
      full_name: payload.full_name as string,
      role: payload.role as UserRole,
    };
  } catch {
    return null;
  }
}

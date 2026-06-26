import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import type { UserRole } from './types';

export interface ServerUser {
  id: number;
  role: UserRole;
}

// Reads the identity injected by proxy.ts (x-user-id / x-user-role headers).
// proxy already verified the JWT, so presence of the header means authenticated.
export async function getCurrentUser(): Promise<ServerUser | null> {
  const h = await headers();
  const id = h.get('x-user-id');
  const role = h.get('x-user-role');
  if (!id || !role) return null;
  return { id: parseInt(id), role: role as UserRole };
}

// Guard helper for route handlers. Returns the user, or a 401/403 NextResponse to return early.
export async function requireRole(
  check: (role: UserRole) => boolean
): Promise<ServerUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Chưa xác thực' }, { status: 401 });
  if (!check(user.role)) return NextResponse.json({ error: 'Không có quyền thực hiện thao tác này' }, { status: 403 });
  return user;
}

export function isAuthError(x: ServerUser | NextResponse): x is NextResponse {
  return x instanceof NextResponse;
}

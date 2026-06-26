import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession, SESSION_COOKIE } from '@/lib/jwt';

// Public API endpoints that do not require authentication.
const PUBLIC_API = ['/api/auth/login', '/api/auth/logout', '/api/health'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only guard API routes here. Page-level guarding is handled client-side
  // (redirect to /login) plus per-route RBAC checks via requireRole().
  if (!pathname.startsWith('/api')) return NextResponse.next();

  if (PUBLIC_API.some((p) => pathname === p)) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    return NextResponse.json({ error: 'Chưa xác thực. Vui lòng đăng nhập lại.' }, { status: 401 });
  }

  // Inject identity downstream. Only ASCII-safe values (id, role) — full_name
  // may contain Vietnamese characters which are invalid in HTTP headers.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', String(session.id));
  requestHeaders.set('x-user-role', session.role);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: '/api/:path*',
};

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';

// Requests that never need a session: the login flow itself, the external
// Meta WhatsApp webhook (which authenticates with its own verify token),
// the publicly-fetchable invoice photo (Meta's servers hit this URL
// directly to pull the image, with no way to send our cookie), and the
// keep-alive health check (hit by a scheduled task with no cookie at all).
function isPublicRoute(pathname: string, method: string): boolean {
  if (pathname === '/login') return true;
  if (pathname === '/api/auth/login') return true;
  if (pathname === '/api/auth/logout') return true;
  if (pathname === '/api/whatsapp/webhook') return true;
  if (pathname === '/api/health') return true;
  if (/^\/api\/invoices\/[^/]+\/image$/.test(pathname) && method === 'GET') return true;
  return false;
}

// Routes reserved for the ADMIN role only.
function isAdminRoute(pathname: string, method: string): boolean {
  if (pathname === '/settings') return true;
  if (pathname === '/api/settings' && method !== 'GET') return true;
  return false;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;
  const isApi = pathname.startsWith('/api');

  if (isPublicRoute(pathname, method)) {
    return NextResponse.next();
  }

  const session = getSessionFromRequest(request);

  if (!session) {
    if (isApi) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminRoute(pathname, method) && session.role !== 'ADMIN') {
    if (isApi) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Everything except Next.js internals and static public assets.
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|ico|jpg|jpeg)$).*)',
  ],
};

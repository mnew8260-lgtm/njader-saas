/**
 * middleware.ts — Protects dashboard & api routes
 * Allows: / /login /signup /api/auth/* /api/telegram/public/*
 */
import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'njader_session';

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/signup',
];

const PUBLIC_API_PREFIXES = [
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/logout',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public pages
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Public API routes
  if (PUBLIC_API_PREFIXES.some((p) => pathname === p)) {
    return NextResponse.next();
  }

  // Static / Next internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Check session cookie (just presence — JWT verification happens server-side in getCurrentUser)
  const session = req.cookies.get(SESSION_COOKIE)?.value;
  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

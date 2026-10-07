/**
 * proxy.ts — Protects dashboard routes + enforces subscription approval
 * Next.js 16 proxy convention (replaces middleware.ts)
 */
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE = 'njader_session';
const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'njader-dev-secret-change-me-in-production-32chars!';

const PUBLIC_PATHS = ['/', '/login', '/signup', '/pending'];
const PUBLIC_API_PATHS = [
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/logout',
  '/api/auth/refresh',  // needed by /pending page to detect approval
  '/api/auth/me',
];

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(JWT_SECRET);
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public pages
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Public API routes
  if (PUBLIC_API_PATHS.some((p) => pathname === p)) {
    return NextResponse.next();
  }

  // Static / Next internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return NextResponse.next();
  }

  const jwt = req.cookies.get(SESSION_COOKIE)?.value;
  if (!jwt) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Decode JWT to check accountStatus
  try {
    const { payload } = await jwtVerify(jwt, getSecretKey());
    const role = (payload.role as string) || 'user';
    const accountStatus = (payload.accountStatus as string) || 'pending';
    const subscriptionEndsAt = payload.subscriptionEndsAt ? new Date(payload.subscriptionEndsAt as string) : null;

    // Owner/admin bypass all checks
    if (role === 'owner' || role === 'admin') {
      return NextResponse.next();
    }

    // Check subscription status
    if (accountStatus !== 'approved') {
      // Approved users with expired subscription go to /pending?reason=expired
      // Pending users go to /pending?reason=pending
      // Rejected users go to /pending?reason=rejected
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ ok: false, error: 'SUBSCRIPTION_INACTIVE', status: accountStatus }, { status: 403 });
      }
      const url = req.nextUrl.clone();
      url.pathname = '/pending';
      url.searchParams.set('reason', accountStatus);
      return NextResponse.redirect(url);
    }

    // Check if subscription expired
    if (subscriptionEndsAt && subscriptionEndsAt.getTime() < Date.now()) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ ok: false, error: 'SUBSCRIPTION_EXPIRED' }, { status: 403 });
      }
      const url = req.nextUrl.clone();
      url.pathname = '/pending';
      url.searchParams.set('reason', 'expired');
      return NextResponse.redirect(url);
    }
  } catch {
    // Invalid JWT — treat as not authenticated
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

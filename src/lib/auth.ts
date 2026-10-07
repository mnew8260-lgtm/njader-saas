/**
 * lib/auth.ts — JWT-based session auth for NJADDER SaaS
 * =====================================================
 * - Passwords hashed with bcryptjs
 * - Sessions stored in DB (UserSession table) + signed JWT in httpOnly cookie
 * - Works on Vercel (no server-side memory needed)
 */

import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { db } from '@/lib/db';

const SESSION_COOKIE = 'njader_session';
const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'njader-dev-secret-change-me-in-production-32chars!';
const SESSION_TTL_DAYS = 30;

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(JWT_SECRET);
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(plain, hash);
  } catch {
    return false;
  }
}

export interface AuthUser {
  id: string;
  username: string | null;
  email: string | null;
  role: string;
  displayName: string | null;
}

/**
 * Create a new session for a user, store it in DB and set a signed JWT cookie.
 * Call this from a Server Action or Route Handler (next/headers cookies() is async).
 */
export async function createSession(user: { id: string; username: string | null; email: string | null; role: string; displayName: string | null }) {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await db.userSession.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
      userAgent: (await headersOrNull()).get('user-agent') || undefined,
      ipAddress: (await headersOrNull()).get('x-forwarded-for') || undefined,
    },
  });

  // Build a JWT containing both session token + user info (so we don't need DB lookups for every request)
  const jwt = await new SignJWT({
    sub: user.id,
    sid: token,
    username: user.username,
    email: user.email,
    role: user.role,
    displayName: user.displayName,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_DAYS}d`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, jwt, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  }).catch(() => {});
}

async function headersOrNull() {
  try {
    const { headers } = await import('next/headers');
    return await headers();
  } catch {
    return new Headers();
  }
}

/**
 * Get the currently authenticated user from the JWT cookie.
 * Returns null if not authenticated or session invalid.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const jwt = cookieStore.get(SESSION_COOKIE)?.value;
    if (!jwt) return null;

    const { payload } = await jwtVerify(jwt, getSecretKey());
    if (!payload.sub) return null;

    return {
      id: payload.sub as string,
      username: (payload.username as string) || null,
      email: (payload.email as string) || null,
      role: (payload.role as string) || 'user',
      displayName: (payload.displayName as string) || null,
    };
  } catch {
    return null;
  }
}

/**
 * Destroy the current session (DB + cookie).
 */
export async function destroySession() {
  try {
    const cookieStore = await cookies();
    const jwt = cookieStore.get(SESSION_COOKIE)?.value;
    if (jwt) {
      const { payload } = await jwtVerify(jwt, getSecretKey()).catch(() => ({ payload: null }));
      if (payload?.sid) {
        await db.userSession.deleteMany({ where: { token: payload.sid as string } }).catch(() => {});
      }
    }
    cookieStore.delete(SESSION_COOKIE);
  } catch {}
}

/**
 * Require auth — throw or redirect. Use in server components / route handlers.
 */
export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('NOT_AUTHENTICATED');
  }
  return user;
}

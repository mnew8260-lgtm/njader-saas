/**
 * /api/auth/login — accepts username OR email + password
 * Now with: rate limiting + account lockout after failed attempts
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, createSession } from '@/lib/auth';
import { checkRateLimit, getClientIp, sanitizeInput } from '@/lib/security';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Track failed login attempts per (identifier + IP)
const failedAttempts = new Map<string, { count: number; lockUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of failedAttempts) {
      if (v.lockUntil < now) failedAttempts.delete(k);
    }
  }, 5 * 60 * 1000).unref?.();
}

export async function POST(req: NextRequest) {
  // Rate limit: 10 login attempts per minute per IP
  const ip = getClientIp(req);
  const rate = checkRateLimit(`login:${ip}`, 10);
  if (!rate.ok) {
    return NextResponse.json(
      { ok: false, error: 'RATE_LIMITED', message: 'محاولات كثيرة. انتظر دقيقة.' },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const identifier = sanitizeInput(String(body.identifier || ''), 100);
  const password = String(body.password || '');

  if (!identifier || !password) {
    return NextResponse.json(
      { ok: false, error: 'MISSING_FIELDS', message: 'مطلوب المعرّف وكلمة المرور' },
      { status: 400 }
    );
  }

  // Check account lockout
  const lockKey = `${identifier}:${ip}`;
  const attempt = failedAttempts.get(lockKey);
  if (attempt && attempt.lockUntil > Date.now()) {
    const remaining = Math.ceil((attempt.lockUntil - Date.now()) / 1000 / 60);
    return NextResponse.json(
      { ok: false, error: 'ACCOUNT_LOCKED', message: `تم قفل الحساب مؤقتاً. حاول بعد ${remaining} دقيقة.` },
      { status: 423 }
    );
  }

  // Find by username or email
  const user = await db.user.findFirst({
    where: {
      OR: [
        { username: identifier },
        { email: identifier.toLowerCase() },
      ],
      isBanned: false,
    },
  });

  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    // Record failed attempt
    const current = failedAttempts.get(lockKey) || { count: 0, lockUntil: 0 };
    current.count++;
    if (current.count >= MAX_ATTEMPTS) {
      current.lockUntil = Date.now() + LOCK_DURATION_MS;
      failedAttempts.set(lockKey, current);
      return NextResponse.json(
        { ok: false, error: 'ACCOUNT_LOCKED', message: `فشل 5 محاولات. تم قفل الحساب 15 دقيقة.` },
        { status: 423 }
      );
    }
    failedAttempts.set(lockKey, current);

    return NextResponse.json(
      { ok: false, error: 'INVALID_CREDENTIALS', message: `بيانات الدخول غير صحيحة (${current.count}/${MAX_ATTEMPTS})` },
      { status: 401 }
    );
  }

  // Successful login — clear attempts
  failedAttempts.delete(lockKey);

  // Create session — include subscription fields so we can enforce in middleware
  await createSession({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    displayName: user.displayName,
    accountStatus: user.accountStatus,
    subscriptionEndsAt: user.subscriptionEndsAt,
    subscriptionPlan: user.subscriptionPlan,
  });

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
      accountStatus: user.accountStatus,
      subscriptionEndsAt: user.subscriptionEndsAt,
      subscriptionPlan: user.subscriptionPlan,
    },
  });
}

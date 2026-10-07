/**
 * /api/auth/signup — creates a new "user" role account (pending approval)
 * Now with: rate limiting + strong password validation + input sanitization
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, createSession } from '@/lib/auth';
import { sendSubscriptionRequest } from '@/lib/subscription';
import {
  checkRateLimit, getClientIp, sanitizeInput, isValidEmail, isValidUsername, isStrongPassword,
} from '@/lib/security';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // Rate limit: 5 signups per minute per IP
  const ip = getClientIp(req);
  const rate = checkRateLimit(`signup:${ip}`, 5);
  if (!rate.ok) {
    return NextResponse.json(
      { ok: false, error: 'RATE_LIMITED', message: 'محاولات كثيرة. انتظر دقيقة.' },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const username = sanitizeInput(String(body.username || ''), 30);
  const email = sanitizeInput(String(body.email || '').toLowerCase(), 254);
  const password = String(body.password || '');

  // Validate username
  if (!isValidUsername(username)) {
    return NextResponse.json(
      { ok: false, error: 'INVALID_USERNAME', message: 'اسم المستخدم: 3-30 حرف لاتينية/أرقام/شرطة سفلية' },
      { status: 400 }
    );
  }

  // Validate email
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { ok: false, error: 'INVALID_EMAIL', message: 'بريد إلكتروني غير صالح' },
      { status: 400 }
    );
  }

  // Validate password strength
  const pwdCheck = isStrongPassword(password);
  if (!pwdCheck.ok) {
    return NextResponse.json(
      { ok: false, error: 'WEAK_PASSWORD', message: pwdCheck.reason || 'كلمة المرور ضعيفة' },
      { status: 400 }
    );
  }

  // Check duplicates
  const exists = await db.user.findFirst({
    where: { OR: [{ username }, { email }] },
  });
  if (exists) {
    return NextResponse.json(
      { ok: false, error: 'USER_EXISTS', message: 'اسم المستخدم أو البريد مستخدم بالفعل' },
      { status: 409 }
    );
  }

  // Create user with PENDING status — needs owner approval
  const user = await db.user.create({
    data: {
      username,
      email,
      passwordHash: hashPassword(password),  // bcrypt with 10 rounds
      displayName: username,
      role: 'user',
      accountStatus: 'pending',
      requestedAt: new Date(),
    },
  });

  // Notify owner of the new subscription request
  await sendSubscriptionRequest({
    userId: user.id,
    userEmail: user.email,
    userUsername: user.username,
  });

  // Create session so the user lands on /pending page
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
      accountStatus: user.accountStatus,
    },
  });
}

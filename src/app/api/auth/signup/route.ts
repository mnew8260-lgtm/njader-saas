/**
 * /api/auth/signup — creates a new "user" role account (pending approval)
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, createSession } from '@/lib/auth';
import { sendSubscriptionRequest } from '@/lib/subscription';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const USERNAME_RE = /^[A-Za-z0-9_]{3,30}$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const username = String(body.username || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (!USERNAME_RE.test(username)) {
    return NextResponse.json(
      { ok: false, error: 'INVALID_USERNAME', message: 'اسم المستخدم: 3-30 حرف لاتينية/أرقام/شرطة سفلية' },
      { status: 400 }
    );
  }
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json(
      { ok: false, error: 'INVALID_EMAIL', message: 'بريد غير صالح' },
      { status: 400 }
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { ok: false, error: 'PASSWORD_TOO_SHORT', message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' },
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
      passwordHash: hashPassword(password),
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

/**
 * /api/auth/refresh — refreshes the JWT cookie with current DB state.
 * Used by the /pending page to detect approval and let the user log in.
 */
import { NextResponse } from 'next/server';
import { getCurrentUser, createSession, destroySession } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  const jwtUser = await getCurrentUser();
  if (!jwtUser) {
    return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 });
  }

  // Fetch fresh user from DB
  const dbUser = await db.user.findUnique({
    where: { id: jwtUser.id },
  });

  if (!dbUser) {
    await destroySession();
    return NextResponse.json({ ok: false, error: 'USER_NOT_FOUND' }, { status: 404 });
  }

  if (dbUser.isBanned) {
    await destroySession();
    return NextResponse.json({
      ok: false,
      error: 'USER_BANNED',
      message: 'تم حظر حسابك. تواصل مع الدعم.',
    }, { status: 403 });
  }

  // Compute effective status (auto-expire if past end date)
  const now = Date.now();
  const endsAt = dbUser.subscriptionEndsAt;
  let effectiveStatus = dbUser.accountStatus;

  if (effectiveStatus === 'approved' && endsAt && new Date(endsAt).getTime() < now) {
    // Mark as expired in DB
    await db.user.update({
      where: { id: dbUser.id },
      data: { accountStatus: 'expired' },
    });
    effectiveStatus = 'expired';
  }

  // Re-create the session with fresh DB data
  await createSession({
    id: dbUser.id,
    username: dbUser.username,
    email: dbUser.email,
    role: dbUser.role,
    displayName: dbUser.displayName,
    accountStatus: effectiveStatus,
    subscriptionEndsAt: dbUser.subscriptionEndsAt,
    subscriptionPlan: dbUser.subscriptionPlan,
  });

  return NextResponse.json({
    ok: true,
    user: {
      id: dbUser.id,
      username: dbUser.username,
      email: dbUser.email,
      role: dbUser.role,
      displayName: dbUser.displayName,
      accountStatus: effectiveStatus,
      subscriptionPlan: dbUser.subscriptionPlan,
      subscriptionEndsAt: dbUser.subscriptionEndsAt,
    },
    message: effectiveStatus === 'approved'
      ? 'تم تفعيل حسابك! يمكنك الآن استخدام النظام.'
      : `حالة الحساب: ${effectiveStatus}`,
  });
}

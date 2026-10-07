/**
 * /api/auth/me — returns current user info from DB (not just from JWT)
 * Useful for the /pending page to detect when owner approves the user.
 */
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const jwtUser = await getCurrentUser();
  if (!jwtUser) {
    return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 });
  }

  // Fetch FRESH data from DB (in case it was updated by owner after JWT was issued)
  const dbUser = await db.user.findUnique({
    where: { id: jwtUser.id },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      role: true,
      accountStatus: true,
      subscriptionPlan: true,
      subscriptionEndsAt: true,
      approvedAt: true,
      rejectionReason: true,
      isBanned: true,
    },
  });

  if (!dbUser) {
    return NextResponse.json({ ok: false, error: 'USER_NOT_FOUND' }, { status: 404 });
  }

  // Compute subscription status
  const now = Date.now();
  const endsAt = dbUser.subscriptionEndsAt;
  let effectiveStatus = dbUser.accountStatus;

  // Auto-detect expired subscription
  if (effectiveStatus === 'approved' && endsAt && new Date(endsAt).getTime() < now) {
    effectiveStatus = 'expired';
  }

  return NextResponse.json({
    ok: true,
    user: {
      ...dbUser,
      accountStatus: effectiveStatus,
      subscriptionActive:
        (dbUser.role === 'owner' || dbUser.role === 'admin') ||
        (effectiveStatus === 'approved' && (!endsAt || new Date(endsAt).getTime() > now)),
    },
  });
}

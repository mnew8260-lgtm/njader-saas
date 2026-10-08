/**
 * /api/admin/users/list — list all users with their subscription status
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 });
  if (user.role !== 'owner' && user.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
  }

  const statusFilter = req.nextUrl.searchParams.get('status') || 'all';
  const where: any = {};
  if (statusFilter !== 'all') where.accountStatus = statusFilter;

  const users = await db.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
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
      approvedBy: true,
      rejectionReason: true,
      requestedAt: true,
      createdAt: true,
      lastLoginAt: true,
      isBanned: true,
      _count: { select: { telegramAccounts: true, commandExecutions: true } },
    },
  });

  return NextResponse.json({ ok: true, users, count: users.length });
}

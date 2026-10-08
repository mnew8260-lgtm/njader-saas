/**
 * /api/admin/users/[id]/approve — approve a user with a subscription plan
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { approveUser, type SubscriptionPlan } from '@/lib/subscription';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_PLANS = ['week', 'month', 'quarter', 'half_year', 'year', 'lifetime'];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 });
  if (user.role !== 'owner' && user.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
  }

  const { id: targetId } = await params;
  const body = await req.json().catch(() => ({}));
  const plan = String(body.plan || 'month') as SubscriptionPlan;

  if (!VALID_PLANS.includes(plan)) {
    return NextResponse.json(
      { ok: false, error: 'INVALID_PLAN', message: 'الخطة غير صالحة' },
      { status: 400 }
    );
  }

  const result = await approveUser({ userId: targetId, owner: user, plan });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

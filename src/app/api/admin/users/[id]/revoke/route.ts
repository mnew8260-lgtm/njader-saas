/**
 * /api/admin/users/[id]/revoke — revoke an active subscription
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { revokeSubscription } from '@/lib/subscription';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 });
  if (user.role !== 'owner' && user.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
  }

  const { id: targetId } = await params;
  const body = await req.json().catch(() => ({}));
  const reason = body.reason ? String(body.reason) : undefined;

  const result = await revokeSubscription({ userId: targetId, owner: user, reason });
  return NextResponse.json(result);
}

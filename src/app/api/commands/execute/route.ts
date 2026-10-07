/**
 * /api/commands/execute — execute a command on a Telegram account
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { executeCommand } from '@/lib/telegram/command-executor';
import { isSubscriptionActive } from '@/lib/subscription';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 });

  // Verify subscription is active (defense-in-depth — middleware should already enforce)
  if (!isSubscriptionActive(user)) {
    return NextResponse.json({ ok: false, error: 'SUBSCRIPTION_INACTIVE' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { accountId, commandId, params } = body;

  if (!accountId || !commandId) {
    return NextResponse.json(
      { ok: false, error: 'MISSING_PARAMS', message: 'مطلوب accountId و commandId' },
      { status: 400 }
    );
  }

  const result = await executeCommand({
    userId: user.id,
    accountId,
    commandId,
    params: params || {},
  });

  return NextResponse.json(result);
}

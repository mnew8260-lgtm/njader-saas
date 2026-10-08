/**
 * /api/commands/execute-multi — execute a command across multiple accounts
 * Body: { accountIds: string[], commandId: string, params: {}, mode: 'parallel'|'sequential' }
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isSubscriptionActive } from '@/lib/subscription';
import { executeMultiAccount } from '@/lib/telegram/multi-account-executor';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 });

  if (!isSubscriptionActive(user)) {
    return NextResponse.json({ ok: false, error: 'SUBSCRIPTION_INACTIVE' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { accountIds, commandId, params, mode } = body;

  if (!accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'MISSING_ACCOUNT_IDS', message: 'مطلوب قائمة حسابات' },
      { status: 400 }
    );
  }

  if (!commandId) {
    return NextResponse.json({ ok: false, error: 'MISSING_COMMAND_ID' }, { status: 400 });
  }

  if (accountIds.length > 10) {
    return NextResponse.json(
      { ok: false, error: 'TOO_MANY_ACCOUNTS', message: 'الحد الأقصى 10 حسابات في المرة الواحدة' },
      { status: 400 }
    );
  }

  const result = await executeMultiAccount({
    userId: user.id,
    accountIds,
    commandId,
    params: params || {},
    mode: mode === 'sequential' ? 'sequential' : 'parallel',
  });

  return NextResponse.json(result);
}

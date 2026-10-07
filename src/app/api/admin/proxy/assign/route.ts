/**
 * /api/admin/proxy/assign — assign a proxy to a Telegram account
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { assignProxyToAccount, unassignProxy } from '@/lib/telegram/proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 });
  if (user.role !== 'owner' && user.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const proxyId = String(body.proxyId || '');
  const accountId = String(body.accountId || '');

  if (!proxyId || !accountId) {
    return NextResponse.json({ ok: false, error: 'MISSING_PARAMS' }, { status: 400 });
  }

  const result = await assignProxyToAccount(proxyId, accountId);
  return NextResponse.json(result);
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 });
  if (user.role !== 'owner' && user.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
  }

  const accountId = req.nextUrl.searchParams.get('accountId');
  if (!accountId) return NextResponse.json({ ok: false, error: 'MISSING_ACCOUNT_ID' }, { status: 400 });

  const result = await unassignProxy(accountId);
  return NextResponse.json(result);
}

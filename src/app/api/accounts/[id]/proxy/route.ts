/**
 * /api/accounts/[id]/proxy — set custom proxy for an account (HYBRID mode)
 * POST: { proxy: {type, host, port, username, password} | null }
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 });

  const { id: accountId } = await params;

  // Verify ownership
  const account = await db.telegramAccount.findFirst({
    where: { id: accountId, ownerId: user.id },
  });
  if (!account) {
    return NextResponse.json({ ok: false, error: 'ACCOUNT_NOT_FOUND' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));

  // If null → clear custom proxy (revert to auto-assigned)
  if (body.proxy === null) {
    await db.telegramAccount.update({
      where: { id: accountId },
      data: { customProxyId: null },
    });
    return NextResponse.json({ ok: true, message: 'تمت إزالة البروكسي المخصص — سيستخدم النظام بروكسي تلقائي' });
  }

  const { type, host, port, username, password } = body.proxy || {};

  // Validate
  if (!host || !port) {
    return NextResponse.json({ ok: false, error: 'HOST_AND_PORT_REQUIRED' }, { status: 400 });
  }
  if (!['socks5', 'http', 'https'].includes(type)) {
    return NextResponse.json({ ok: false, error: 'INVALID_TYPE' }, { status: 400 });
  }
  if (port < 1 || port > 65535) {
    return NextResponse.json({ ok: false, error: 'INVALID_PORT' }, { status: 400 });
  }

  // Create a new proxy entry owned by this user (enabled, marked as custom)
  const proxy = await db.proxy.create({
    data: {
      type,
      host: String(host),
      port: Number(port),
      username: username || null,
      password: password || null,
      country: 'custom',
      enabled: true,
      isWorking: true,
    },
  });

  // Assign it as custom proxy for the account
  await db.telegramAccount.update({
    where: { id: accountId },
    data: { customProxyId: proxy.id },
  });

  return NextResponse.json({
    ok: true,
    message: 'تم تعيين البروكسي المخصص بنجاح — سيُستخدم في كل عمليات هذا الحساب',
    proxyId: proxy.id,
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 });

  const { id: accountId } = await params;
  const account = await db.telegramAccount.findFirst({
    where: { id: accountId, ownerId: user.id },
    select: {
      customProxy: true,
      proxyAssignments: { include: { proxy: true }, take: 1 },
    },
  });

  if (!account) return NextResponse.json({ ok: false, error: 'ACCOUNT_NOT_FOUND' }, { status: 404 });

  return NextResponse.json({
    ok: true,
    customProxy: account.customProxy ? {
      type: account.customProxy.type,
      host: account.customProxy.host,
      port: account.customProxy.port,
      isWorking: account.customProxy.isWorking,
    } : null,
    autoProxy: account.proxyAssignments[0]?.proxy ? {
      type: account.proxyAssignments[0].proxy.type,
      host: account.proxyAssignments[0].proxy.host,
      port: account.proxyAssignments[0].proxy.port,
    } : null,
    effectiveProxy: account.customProxy || account.proxyAssignments[0]?.proxy || null,
  });
}

/**
 * /api/telegram/logout — Vercel-compatible
 * ---------------------------------------
 * Revoke session + clear session string from DB.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { logout } from '@/lib/telegram/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const phone = String(body.phone || '').trim();
  if (!phone) {
    return NextResponse.json({ ok: false, error: 'PHONE_REQUIRED' }, { status: 400 });
  }

  const normalized = phone.startsWith('+') ? phone : '+' + phone.replace(/\D/g, '');

  // Verify ownership
  const account = await db.telegramAccount.findFirst({
    where: { phone: normalized, ownerId: user.id },
  });
  if (!account && user.role !== 'owner' && user.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'NOT_OWNER_OF_ACCOUNT' }, { status: 403 });
  }

  const result = await logout(normalized);

  if (result.ok) {
    await db.telegramAccount.deleteMany({
      where: { phone: normalized, ownerId: user.id },
    }).catch(() => {});

    await db.activityLog.create({
      data: {
        action: 'login.logout',
        detail: `phone=${normalized}`,
        category: 'auth',
        severity: 'info',
        userId: user.id,
      },
    }).catch(() => {});
  }

  return NextResponse.json(result);
}

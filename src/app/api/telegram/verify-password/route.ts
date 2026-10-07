/**
 * /api/telegram/verify-password — Vercel-compatible
 * -------------------------------------------------
 * Step 3 (optional): User has 2FA enabled. Provide password.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/telegram/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const phone = String(body.phone || '').trim();
  const password = String(body.password || '');

  if (!phone || !password) {
    return NextResponse.json({ ok: false, error: 'PHONE_AND_PASSWORD_REQUIRED' }, { status: 400 });
  }

  const normalized = phone.startsWith('+') ? phone : '+' + phone.replace(/\D/g, '');
  const result = await verifyPassword(normalized, password);

  await db.activityLog.create({
    data: {
      action: 'login.verify_2fa',
      detail: `phone=${normalized} status=${result.status}`,
      category: 'auth',
      severity: result.ok ? 'success' : 'warn',
      userId: user.id,
    },
  }).catch(() => {});

  if (!result.ok) {
    let message = result.error || 'فشل التحقق من كلمة المرور';
    if (result.error?.includes('INVALID_PASSWORD')) {
      message = 'كلمة المرور الثنائية غير صحيحة. حاول مرة أخرى.';
    }
    return NextResponse.json({ ...result, message }, { status: 400 });
  }

  // Save TelegramAccount
  if (result.status === 'logged_in' && result.user) {
    await db.telegramAccount.upsert({
      where: { phone: normalized },
      create: {
        phone: normalized,
        apiId: '***',
        apiHash: '***',
        status: 'idle',
        fullName: result.user.first_name || null,
        username: result.user.username || null,
        deviceModel: 'njadder',
        ownerId: user.id,
      },
      update: {
        status: 'idle',
        fullName: result.user.first_name || null,
        username: result.user.username || null,
        ownerId: user.id,
      },
    }).catch(() => {});
  }

  return NextResponse.json(result);
}

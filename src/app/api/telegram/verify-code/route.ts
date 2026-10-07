/**
 * /api/telegram/verify-code — Vercel-compatible
 * --------------------------------------------
 * Step 2: User enters the code received via Telegram.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { verifyCode } from '@/lib/telegram/client';

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
  const code = String(body.code || '').trim();
  const phoneCodeHash = String(body.phone_code_hash || '').trim();

  if (!phone || !code) {
    return NextResponse.json({ ok: false, error: 'PHONE_AND_CODE_REQUIRED' }, { status: 400 });
  }
  if (code.length < 4) {
    return NextResponse.json({ ok: false, error: 'CODE_TOO_SHORT' }, { status: 400 });
  }

  const normalized = phone.startsWith('+') ? phone : '+' + phone.replace(/\D/g, '');
  const result = await verifyCode(normalized, code, phoneCodeHash);

  await db.activityLog.create({
    data: {
      action: 'login.verify_code',
      detail: `phone=${normalized} status=${result.status}`,
      category: 'auth',
      severity: result.ok ? 'success' : 'warn',
      userId: user.id,
    },
  }).catch(() => {});

  if (!result.ok) {
    let message = result.error || 'فشل التحقق';
    if (result.error?.includes('INVALID_CODE')) message = 'الكود غير صحيح. حاول مرة أخرى.';
    else if (result.error?.includes('CODE_EXPIRED')) message = 'انتهت صلاحية الكود. اطلب كوداً جديداً.';
    else if (result.error?.includes('NO_PHONE_CODE_HASH')) message = 'انتهت الجلسة. ابدأ من جديد بطلب كود.';
    return NextResponse.json({ ...result, message }, { status: 400 });
  }

  // Save TelegramAccount in DB
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

/**
 * /api/telegram/send-code — Vercel-compatible
 * -------------------------------------------
 * Step 1: User provides phone ONLY.
 * API credentials come from DB (api_pool).
 * Set maxDuration for Vercel Pro/Enterprise.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendCode } from '@/lib/telegram/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60; // Vercel Pro tier (10 for Hobby)

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

  let normalized = phone.replace(/\D/g, '');
  if (!normalized) {
    return NextResponse.json({ ok: false, error: 'PHONE_INVALID' }, { status: 400 });
  }
  normalized = '+' + normalized;

  const result = await sendCode(normalized);

  await db.activityLog.create({
    data: {
      action: 'login.send_code',
      detail: `phone=${normalized} status=${result.status}`,
      category: 'auth',
      severity: result.ok ? 'success' : 'warn',
      userId: user.id,
    },
  }).catch(() => {});

  if (!result.ok) {
    let message = result.error || 'فشل إرسال الكود';
    if (result.error?.includes('FLOOD_WAIT')) {
      const sec = result.error.match(/FLOOD_WAIT:(\d+)/)?.[1] || '60';
      message = `يرجى الانتظار ${sec} ثانية قبل المحاولة مرة أخرى`;
    } else if (result.error?.includes('PHONE_NUMBER_INVALID')) {
      message = 'رقم الهاتف غير صالح في تيليجرام';
    } else if (result.error?.includes('API_POOL_EMPTY')) {
      message = 'لم يضف المالك أي API بعد. تواصل مع الدعم.';
    } else if (result.error?.includes('RATE_LIMITED')) {
      message = 'طلبت 3 أكواد في آخر 10 دقائق. انتظر قليلاً.';
    }
    return NextResponse.json({ ...result, message }, { status: 400 });
  }

  return NextResponse.json(result);
}

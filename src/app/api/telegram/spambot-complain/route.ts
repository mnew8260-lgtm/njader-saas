/**
 * /api/telegram/spambot-complain — Step 3: submit complaint to @SpamBot
 * Takes ~5s, well within Vercel 10s limit
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { makeClient } from '@/lib/telegram/client';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Python: _COMplaint_TEXT
const COMPLAINT = "I'm a developer testing my application. I never sent any spam and would never do that. Please remove the limit.";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const phone = String(body.phone || '');
  if (!phone) return NextResponse.json({ ok: false, error: 'PHONE_REQUIRED' }, { status: 400 });

  let client;
  try {
    ({ client } = await makeClient(phone));
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'CONNECT_FAILED' });
  }

  try {
    // Python: submit_spambot_complaint flow
    await client.sendMessage('spambot', { message: '/start' });
    await new Promise(r => setTimeout(r, 1500));

    await client.sendMessage('spambot', { message: 'This is a mistake' });
    await new Promise(r => setTimeout(r, 1500));

    await client.sendMessage('spambot', { message: 'Yes' });
    await new Promise(r => setTimeout(r, 1500));

    await client.sendMessage('spambot', { message: "No, I'll never do any of this!" });
    await new Promise(r => setTimeout(r, 1500));

    await client.sendMessage('spambot', { message: COMPLAINT });

    await client.disconnect();

    // Mark account as having complaint submitted
    const account = await db.telegramAccount.findUnique({ where: { phone }, select: { id: true } });
    if (account) {
      await db.telegramAccount.update({
        where: { id: account.id },
        data: { status: 'complaint_submitted' },
      }).catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      message: '✅ تم إرسال شكوى لـ @SpamBot تلقائياً — قد يستغرق رفع التقييد 24-48 ساعة',
    });
  } catch (e: any) {
    try { await client.disconnect(); } catch {}
    return NextResponse.json({ ok: false, error: e.message?.substring(0, 80) });
  }
}

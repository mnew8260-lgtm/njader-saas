/**
 * /api/telegram/spambot-start — Step 1: send /start to @SpamBot
 * Takes ~3s, well within Vercel 10s limit
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { makeClient } from '@/lib/telegram/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
    return NextResponse.json({ ok: false, error: 'CONNECT_FAILED: ' + e.message?.substring(0, 50) });
  }

  try {
    await client.sendMessage('spambot', { message: '/start' });
    await client.disconnect();
    return NextResponse.json({ ok: true, message: 'تم إرسال /start لـ @SpamBot' });
  } catch (e: any) {
    try { await client.disconnect(); } catch {}
    return NextResponse.json({ ok: false, error: e.message?.substring(0, 80) });
  }
}

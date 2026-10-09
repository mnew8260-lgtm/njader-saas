/**
 * /api/telegram/spambot-read — Step 2: read @SpamBot response
 * Takes ~2s, well within Vercel 10s limit
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { makeClient } from '@/lib/telegram/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Python: _NO_LIMIT_MSG
const NO_LIMIT = "Good news, no limits are currently applied to your account. You're free as a bird!";
// Python: _HARSH_MSG
const HARSH_MSG = "Unfortunately, some phone numbers may trigger a harsh response from our anti-spam systems.";

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
    const msgs = await client.getMessages('spambot', { limit: 1 });
    const text = (msgs[0] as any)?.message || '';
    await client.disconnect();

    // Python: check_spambot_status logic
    const lower = text.toLowerCase();
    let status = 'unknown';

    if (lower.includes('good news') || lower.includes('free as a bird')) {
      status = 'clean';
    } else if (lower.includes('harsh') || lower.includes('limited') || lower.includes('restricted') ||
               lower.includes('مقيّد') || lower.includes('تقييد') || lower.includes('مزعج')) {
      status = 'restricted';
    } else if (lower.includes('banned') && (lower.includes('phone') || lower.includes('number'))) {
      status = 'banned';
    }

    return NextResponse.json({
      ok: true,
      status,
      text: text.substring(0, 300),
      isRestricted: status === 'restricted',
      isBanned: status === 'banned',
      isClean: status === 'clean',
    });
  } catch (e: any) {
    try { await client.disconnect(); } catch {}
    return NextResponse.json({ ok: false, error: e.message?.substring(0, 80) });
  }
}

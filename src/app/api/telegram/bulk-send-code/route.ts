/**
 * /api/telegram/bulk-send-code — send login codes to multiple phone numbers
 * Body: { phones: string[] }
 * Returns: { results: [{ phone, status, message }] }
 *
 * Each phone gets a code sent automatically. User then enters codes one by one.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { sendCode } from '@/lib/telegram/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const phones: string[] = (body.phones || []).map((p: string) => p.trim()).filter(Boolean);

  if (phones.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'NO_PHONES', message: 'أدخل رقم واحد على الأقل' },
      { status: 400 }
    );
  }

  if (phones.length > 10) {
    return NextResponse.json(
      { ok: false, error: 'TOO_MANY', message: 'الحد الأقصى 10 أرقام في المرة' },
      { status: 400 }
    );
  }

  const results: Array<{ phone: string; status: string; message: string; next_step?: string }> = [];

  // Send codes sequentially (to avoid API pool exhaustion)
  for (const phone of phones) {
    try {
      const result = await sendCode(phone);
      results.push({
        phone: result.phone,
        status: result.status,
        message: result.message || result.error || '',
        next_step: result.next_step,
      });
    } catch (e: any) {
      results.push({
        phone,
        status: 'error',
        message: e.message,
      });
    }
    // Small delay between phones
    await new Promise((r) => setTimeout(r, 1500));
  }

  const successCount = results.filter((r) => r.status === 'code_sent').length;
  const alreadyCount = results.filter((r) => r.status === 'already_logged_in').length;
  const errorCount = results.filter((r) => r.status === 'error').length;

  return NextResponse.json({
    ok: true,
    results,
    summary: {
      total: phones.length,
      codeSent: successCount,
      alreadyLoggedIn: alreadyCount,
      errors: errorCount,
    },
  });
}

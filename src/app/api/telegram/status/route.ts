/**
 * /api/telegram/status — Vercel-compatible
 * ----------------------------------------
 * Check if a phone's session is still valid.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getStatus } from '@/lib/telegram/client';

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
  const result = await getStatus(normalized);
  return NextResponse.json(result);
}

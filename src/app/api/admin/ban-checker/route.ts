/**
 * /api/admin/ban-checker — check bans on all user accounts or a specific account
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { checkAllUserAccounts, checkBan } from '@/lib/telegram/ban-checker';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const phone = body.phone ? String(body.phone) : null;

  if (phone) {
    // Check single account
    const result = await checkBan(phone);
    return NextResponse.json({ ok: true, phone, ...result });
  }

  // Check all user's accounts
  const result = await checkAllUserAccounts(user.id);
  return NextResponse.json({ ok: true, ...result });
}

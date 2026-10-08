/**
 * /api/admin/ban-checker — deep ban check on all accounts or a specific account
 * Owner/admin: checks ALL accounts in the system
 * Regular user: checks only their accounts
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
    // Check single account (deep check: getMe + getDialogs + sendMessage + sessions + 2FA)
    const result = await checkBan(phone);
    return NextResponse.json({ ok: true, phone, ...result });
  }

  // Check all accounts
  // Owner/admin can check ALL accounts in the system (not just their own)
  const isOwner = user.role === 'owner' || user.role === 'admin';
  const result = await checkAllUserAccounts(user.id, isOwner);
  return NextResponse.json({ ok: true, ...result });
}

/**
 * /api/admin/ban-checker — ban check
 * Mode 1: "basic" → just getMe() (like Python check_banned_accounts_live)
 * Mode 2: "deep" → walk @SpamBot (like Python limit_check_and_remove)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { checkAllUserAccounts, checkBan, limitCheckRemove } from '@/lib/telegram/ban-checker';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const phone = body.phone ? String(body.phone) : null;
  const mode = body.mode || 'basic'; // "basic" or "deep"

  if (phone) {
    // Check single account
    if (mode === 'deep') {
      // Walk @SpamBot conversation flow
      const result = await limitCheckRemove(phone);
      return NextResponse.json({ ok: true, phone, ...result });
    }
    // Basic check (getMe only)
    const result = await checkBan(phone);
    return NextResponse.json({ ok: true, phone, ...result });
  }

  // Check all accounts (basic mode only — deep mode would timeout)
  const isOwner = user.role === 'owner' || user.role === 'admin';
  const result = await checkAllUserAccounts(user.id, isOwner);
  return NextResponse.json({ ok: true, ...result });
}

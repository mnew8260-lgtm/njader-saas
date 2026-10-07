/**
 * /api/commands/list — list all available Telegram commands
 */
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { COMMANDS, COMMAND_CATEGORIES, getCommandStats } from '@/lib/commands';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 });

  return NextResponse.json({
    ok: true,
    commands: COMMANDS,
    categories: COMMAND_CATEGORIES,
    stats: getCommandStats(),
  });
}

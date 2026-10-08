/**
 * /api/commands/history — get command execution history for the user
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 });

  const limit = Number(req.nextUrl.searchParams.get('limit') || 50);
  const history = await db.commandExecution.findMany({
    where: { userId: user.id },
    orderBy: { executedAt: 'desc' },
    take: Math.min(limit, 200),
    select: {
      id: true,
      commandId: true,
      commandName: true,
      input: true,
      output: true,
      status: true,
      duration: true,
      executedAt: true,
      accountId: true,
    },
  });

  return NextResponse.json({ ok: true, history, count: history.length });
}

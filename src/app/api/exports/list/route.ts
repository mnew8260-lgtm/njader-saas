/**
 * /api/exports/list — list all scrape exports for current user
 */
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 });

  const exports = await db.scrapeExport.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      commandId: true,
      commandName: true,
      format: true,
      sourcePeer: true,
      totalCount: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, exports, count: exports.length });
}

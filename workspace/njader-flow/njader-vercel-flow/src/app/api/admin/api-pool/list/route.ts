/**
 * /api/admin/api-pool/list — Vercel-compatible
 * --------------------------------------------
 * List all API credentials (api_hash is masked).
 */
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { poolListDb } from '@/lib/telegram/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 });
  }
  if (user.role !== 'owner' && user.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
  }

  const pool = await poolListDb();
  return NextResponse.json({ ok: true, pool, count: pool.length });
}

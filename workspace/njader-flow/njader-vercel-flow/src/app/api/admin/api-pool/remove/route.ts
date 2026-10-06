/**
 * /api/admin/api-pool/remove — Vercel-compatible
 * ---------------------------------------------
 * Disable an api_id in the pool (DB).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { poolRemoveDb } from '@/lib/telegram/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 });
  }
  if (user.role !== 'owner' && user.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const apiId = String(body.api_id || '').trim();
  if (!apiId) {
    return NextResponse.json({ ok: false, error: 'API_ID_REQUIRED' }, { status: 400 });
  }

  const result = await poolRemoveDb(apiId);

  await db.adminAuditLog.create({
    data: {
      actorId: user.id,
      action: 'api_pool.remove',
      targetId: apiId,
      detail: `Removed API ${apiId}`,
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
    },
  }).catch(() => {});

  return NextResponse.json(result);
}

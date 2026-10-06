/**
 * /api/admin/api-pool/add — Vercel-compatible
 * ------------------------------------------
 * Add new api_id/api_hash to the pool (DB).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { poolAddDb } from '@/lib/telegram/client';

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
  const apiHash = String(body.api_hash || '').trim();
  const label = String(body.label || '').trim();

  if (!apiId || !apiHash) {
    return NextResponse.json(
      { ok: false, error: 'API_ID_AND_HASH_REQUIRED', message: 'مطلوب api_id و api_hash' },
      { status: 400 }
    );
  }
  if (!/^\d+$/.test(apiId)) {
    return NextResponse.json(
      { ok: false, error: 'API_ID_MUST_BE_NUMERIC', message: 'api_id يجب أن يكون رقمي' },
      { status: 400 }
    );
  }
  if (apiHash.length < 20) {
    return NextResponse.json(
      { ok: false, error: 'API_HASH_TOO_SHORT', message: 'api_hash قصير جداً' },
      { status: 400 }
    );
  }

  const result = await poolAddDb(apiId, apiHash, label);

  await db.adminAuditLog.create({
    data: {
      actorId: user.id,
      action: 'api_pool.add',
      targetId: apiId,
      detail: `Added API ${apiId} (${label || 'no label'})`,
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
    },
  }).catch(() => {});

  return NextResponse.json(result);
}

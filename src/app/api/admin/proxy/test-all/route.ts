/**
 * /api/admin/proxy/test-all — test all proxies at once
 */
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { testProxy } from '@/lib/telegram/proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 });
  if (user.role !== 'owner' && user.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
  }

  const proxies = await db.proxy.findMany({ select: { id: true, host: true, port: true } });

  const results: { id: string; host: string; port: number; ok: boolean; latency?: number; error?: string }[] = [];
  let working = 0, notWorking = 0;

  for (const p of proxies) {
    const result = await testProxy(p.id);
    results.push({
      id: p.id,
      host: p.host,
      port: p.port,
      ok: result.ok,
      latency: result.latency,
      error: result.error,
    });
    if (result.ok) working++; else notWorking++;
  }

  return NextResponse.json({
    ok: true,
    total: proxies.length,
    working,
    notWorking,
    results,
  });
}

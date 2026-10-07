/**
 * /api/admin/proxy — list/add proxies (GET = list, POST = add)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { addProxy, listProxies } from '@/lib/telegram/proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 });
  if (user.role !== 'owner' && user.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
  }

  const proxies = await listProxies();
  return NextResponse.json({ ok: true, proxies });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 });
  if (user.role !== 'owner' && user.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const type = String(body.type || 'socks5');
  const host = String(body.host || '').trim();
  const port = Number(body.port || 0);
  const username = body.username ? String(body.username) : undefined;
  const password = body.password ? String(body.password) : undefined;
  const country = body.country ? String(body.country) : undefined;

  if (!host || !port || port < 1 || port > 65535) {
    return NextResponse.json({ ok: false, error: 'INVALID_INPUT', message: 'host و port مطلوبان' }, { status: 400 });
  }

  if (!['socks5', 'http', 'https'].includes(type)) {
    return NextResponse.json({ ok: false, error: 'INVALID_TYPE' }, { status: 400 });
  }

  const result = await addProxy({ type: type as any, host, port, username, password, country });
  return NextResponse.json(result);
}

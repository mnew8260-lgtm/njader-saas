/**
 * lib/telegram/proxy.ts — Proxy manager for Telegram accounts
 * ===========================================================
 */

import { db } from '@/lib/db';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';

export interface ProxyInput {
  type: 'socks5' | 'http' | 'https';
  host: string;
  port: number;
  username?: string;
  password?: string;
  country?: string;
}

export async function addProxy(input: ProxyInput) {
  const proxy = await db.proxy.create({
    data: {
      type: input.type,
      host: input.host,
      port: input.port,
      username: input.username || null,
      password: input.password || null,
      country: input.country || null,
      enabled: true,
      isWorking: true,
    },
  });
  return { ok: true, id: proxy.id };
}

export async function listProxies() {
  const proxies = await db.proxy.findMany({
    orderBy: { createdAt: 'desc' },
    include: { assignments: { include: { account: { select: { phone: true, fullName: true } } } } },
  });
  return proxies.map((p) => ({
    id: p.id,
    type: p.type,
    host: p.host,
    port: p.port,
    country: p.country,
    enabled: p.enabled,
    isWorking: p.isWorking,
    latency: p.latency,
    usedCount: p.usedCount,
    failCount: p.failCount,
    lastChecked: p.lastChecked,
    assignedAccounts: p.assignments.map((a) => ({
      phone: a.account.phone,
      fullName: a.account.fullName,
    })),
  }));
}

export async function removeProxy(id: string) {
  await db.proxy.delete({ where: { id } });
  return { ok: true };
}

export async function assignProxyToAccount(proxyId: string, accountId: string) {
  // Each account has at most one proxy (unique constraint on accountId)
  await db.proxyAssignment.upsert({
    where: { accountId },
    create: { proxyId, accountId },
    update: { proxyId },
  });
  await db.proxy.update({
    where: { id: proxyId },
    data: { usedCount: { increment: 1 } },
  });
  return { ok: true };
}

export async function unassignProxy(accountId: string) {
  await db.proxyAssignment.deleteMany({ where: { accountId } });
  return { ok: true };
}

/**
 * Test a proxy by attempting an HTTP request through it.
 */
export async function testProxy(id: string): Promise<{ ok: boolean; latency?: number; error?: string }> {
  const proxy = await db.proxy.findUnique({ where: { id } });
  if (!proxy) return { ok: false, error: 'Proxy not found' };

  const start = Date.now();
  try {
    // Build proxy URL
    const auth = proxy.username
      ? `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password || '')}@`
      : '';
    const proxyUrl = `${proxy.type}://${auth}${proxy.host}:${proxy.port}`;

    let agent: any;
    if (proxy.type === 'socks5') {
      agent = new SocksProxyAgent(proxyUrl);
    } else {
      agent = new HttpsProxyAgent(proxyUrl);
    }

    // Try to fetch a known-fast endpoint
    const res = await fetch('https://api.telegram.org', {
      agent,
      signal: AbortSignal.timeout(10000),
    } as any);

    const latency = Date.now() - start;
    const isWorking = res.status === 200 || res.status === 302 || res.status === 404;

    await db.proxy.update({
      where: { id },
      data: {
        isWorking,
        latency,
        lastChecked: new Date(),
        failCount: isWorking ? 0 : { increment: 1 } as any,
      },
    });

    return { ok: isWorking, latency, error: isWorking ? undefined : `HTTP ${res.status}` };
  } catch (e: any) {
    const latency = Date.now() - start;
    await db.proxy.update({
      where: { id },
      data: {
        isWorking: false,
        latency,
        lastChecked: new Date(),
        failCount: { increment: 1 },
      },
    });
    return { ok: false, latency, error: e.message };
  }
}

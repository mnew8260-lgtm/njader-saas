/**
 * /api/admin/proxy/import — bulk import proxies from text
 * Format: one proxy per line, formats supported:
 *   socks5://user:pass@host:port
 *   socks5://host:port
 *   host:port:user:pass
 *   host:port
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ParsedProxy {
  type: 'socks5' | 'http' | 'https';
  host: string;
  port: number;
  username?: string;
  password?: string;
}

function parseProxyLine(line: string): ParsedProxy | null {
  line = line.trim();
  if (!line || line.startsWith('#')) return null;

  // Format 1: socks5://user:pass@host:port
  const m1 = line.match(/^(socks5|http|https):\/\/(?:([^:]+):([^@]+)@)?([^:]+):(\d+)$/i);
  if (m1) {
    return {
      type: m1[1].toLowerCase() as any,
      host: m1[4],
      port: parseInt(m1[5], 10),
      username: m1[2] || undefined,
      password: m1[3] || undefined,
    };
  }

  // Format 2: host:port:user:pass
  const parts = line.split(':');
  if (parts.length === 4) {
    return {
      type: 'socks5',
      host: parts[0],
      port: parseInt(parts[1], 10),
      username: parts[2],
      password: parts[3],
    };
  }
  // Format 3: host:port (no auth, default socks5)
  if (parts.length === 2) {
    const port = parseInt(parts[1], 10);
    if (!isNaN(port) && port > 0 && port <= 65535) {
      return {
        type: 'socks5',
        host: parts[0],
        port,
      };
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'NOT_AUTHENTICATED' }, { status: 401 });
  if (user.role !== 'owner' && user.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'FORBIDDEN' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const text = String(body.text || '');
  const defaultType = body.defaultType || 'socks5';
  const lines = text.split('\n');

  let added = 0, skipped = 0, failed = 0;
  const errors: string[] = [];

  for (const line of lines) {
    let parsed = parseProxyLine(line);
    if (!parsed) {
      if (line.trim() && !line.startsWith('#')) {
        failed++;
        errors.push(`Invalid: ${line.substring(0, 50)}`);
      }
      continue;
    }

    // Override type if specified
    if (defaultType !== 'auto') parsed.type = defaultType as any;

    // Check if proxy already exists
    const existing = await db.proxy.findFirst({
      where: { host: parsed.host, port: parsed.port },
    });
    if (existing) {
      skipped++;
      continue;
    }

    try {
      await db.proxy.create({
        data: {
          type: parsed.type,
          host: parsed.host,
          port: parsed.port,
          username: parsed.username || null,
          password: parsed.password || null,
          country: null,
          enabled: true,
          isWorking: true,
        },
      });
      added++;
    } catch (e: any) {
      failed++;
      errors.push(`Failed: ${parsed.host}:${parsed.port} - ${e.message?.substring(0, 50)}`);
    }
  }

  return NextResponse.json({
    ok: true,
    message: `تم استيراد ${added} بروكسي · تخطّي ${skipped} مكرر · فشل ${failed}`,
    added,
    skipped,
    failed,
    errors: errors.slice(0, 10),
  });
}

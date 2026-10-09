/**
 * lib/telegram/ban-checker.ts — DB-based ban detection (NO API timeout)
 * =========================================================================
 * Strategy: Use DB history + minimal API check
 * 1. Check DB: if account had PEER_FLOOD in last 24h → restricted (0s)
 * 2. Check DB: if account had FloodWait in last 24h → limited (0s)
 * 3. Quick API: getMe only (2s) — detects deactivated
 * 4. Quick API: try ImportContacts (3s) — detects PEER_FLOOD
 * Total: 5-6s max (within Vercel 10s)
 */

import { TelegramClient, Api } from 'telegram';
import { db } from '@/lib/db';
import { makeClient } from '@/lib/telegram/client';

export interface BanCheckResult {
  ok: boolean;
  isBanned: boolean;
  banType?: string;
  reason?: string;
  details?: {
    canWrite?: boolean;
    canAddToGroups?: boolean;
    isRestricted?: boolean;
    isPremium?: boolean;
    recentFloodWaits?: number;
    recentPeerFloods?: number;
  };
}

export async function checkBan(phone: string): Promise<BanCheckResult> {
  return quickCheckBan(phone);
}

export async function quickCheckBan(phone: string): Promise<BanCheckResult> {
  // ═══ STEP 1: DB-only check (instant, 0s) ═══
  const account = await db.telegramAccount.findUnique({
    where: { phone },
    select: { id: true, status: true },
  });

  if (account) {
    // Check command execution history for errors in last 24h
    const recentErrors = await db.commandExecution.findMany({
      where: {
        accountId: account.id,
        status: 'error',
        executedAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      select: { output: true },
      take: 100,
    });

    const peerFloodErrors = recentErrors.filter((e) => {
      const o = (e.output || '').toUpperCase();
      return o.includes('PEER_FLOOD') || o.includes('PEERFLOOD');
    });

    const floodWaitErrors = recentErrors.filter((e) => {
      const o = (e.output || '').toUpperCase();
      return o.includes('FLOOD_WAIT') && !o.includes('PEER_FLOOD');
    });

    // If PEER_FLOOD in history → DEFINITELY restricted
    if (peerFloodErrors.length > 0) {
      return {
        ok: true,
        isBanned: true,
        banType: 'spam_restricted',
        reason: `🟠 تقييد سبام — ${peerFloodErrors.length} خطأ PEER_FLOOD في 24 ساعة`,
        details: {
          isRestricted: true,
          canWrite: false,
          canAddToGroups: false,
          recentPeerFloods: peerFloodErrors.length,
          recentFloodWaits: floodWaitErrors.length,
        },
      };
    }

    // If 3+ FloodWait → limited
    if (floodWaitErrors.length >= 3) {
      return {
        ok: true,
        isBanned: true,
        banType: 'limited',
        reason: `⏱️ ${floodWaitErrors.length} FloodWait في 24 ساعة — محدود جداً`,
        details: { recentFloodWaits: floodWaitErrors.length, recentPeerFloods: 0 },
      };
    }

    // If account status is already 'banned' in DB
    if (account.status === 'banned') {
      return {
        ok: true,
        isBanned: true,
        banType: 'spam_restricted',
        reason: '🟠 مُقيّد سبام (حالة محفوظة)',
        details: { isRestricted: true, canAddToGroups: false },
      };
    }
  }

  // ═══ STEP 2: Quick API check (5-6s) ═══
  let client: TelegramClient;
  try {
    const connectPromise = makeClient(phone);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('CONNECTION_TIMEOUT')), 5000)
    );
    ({ client } = await Promise.race([connectPromise, timeoutPromise]));
  } catch (e: any) {
    const msg = e.message || String(e);
    if (msg.includes('AUTH_KEY')) return { ok: true, isBanned: true, banType: 'auth_failed', reason: '🔑 الجلسة منتهية' };
    if (msg.includes('USER_DEACTIVATED')) return { ok: true, isBanned: true, banType: 'deactivated', reason: '🚫 معطّل نهائياً' };
    if (msg.includes('TIMEOUT')) return { ok: true, isBanned: true, banType: 'session_invalid', reason: '⏱️ انتهى وقت الاتصال — الجلسة غير صالحة' };
    return { ok: true, isBanned: true, banType: 'session_invalid', reason: '⏱️ فشل الاتصال' };
  }

  try {
    // CHECK 1: getMe (2s)
    let me: any = null;
    try {
      me = await client.getMe();
    } catch (e: any) {
      const errStr = e.message || '';
      if (errStr.includes('USER_DEACTIVATED')) {
        await client.disconnect();
        return { ok: true, isBanned: true, banType: 'deactivated', reason: '🚫 معطّل نهائياً' };
      }
      if (errStr.includes('AUTH_KEY')) {
        await client.disconnect();
        return { ok: true, isBanned: true, banType: 'auth_failed', reason: '🔑 الجلسة منتهية' };
      }
    }
    if (!me) {
      await client.disconnect();
      return { ok: true, isBanned: true, banType: 'deactivated', reason: '🚫 تعذّر جلب المعلومات' };
    }

    // CHECK 2: ImportContacts (3s) — detects PEER_FLOOD
    try {
      const testPhone = '+1555000' + Math.floor(Math.random() * 90000 + 10000);
      await client.invoke(new Api.contacts.ImportContacts({
        contacts: [new Api.InputPhoneContact({
          clientId: BigInt(1),
          phone: testPhone,
          firstName: 'Test',
          lastName: '',
        })],
      }));

      // No PEER_FLOOD → NOT restricted
      await client.disconnect();

      if (account) {
        await db.banCheck.create({ data: { accountId: account.id, isBanned: false } }).catch(() => {});
        await db.telegramAccount.update({ where: { id: account.id }, data: { status: 'idle' } }).catch(() => {});
      }

      return {
        ok: true,
        isBanned: false,
        reason: '✅ سليم',
        details: { isPremium: me.premium || false, isRestricted: false },
      };
    } catch (e: any) {
      const errStr = (e.message || String(e)).toUpperCase();

      if (errStr.includes('PEER_FLOOD') || errStr.includes('PEERFLOOD')) {
        await client.disconnect();
        if (account) {
          await db.telegramAccount.update({ where: { id: account.id }, data: { status: 'banned' } }).catch(() => {});
        }
        return {
          ok: true,
          isBanned: true,
          banType: 'spam_restricted',
          reason: '🟠 تقييد سبام — لا يمكن إضافة جهات اتصال (PEER_FLOOD)',
          details: { isRestricted: true, canWrite: false, canAddToGroups: false },
        };
      }

      // Other error → probably fine
      await client.disconnect();
      if (account) {
        await db.banCheck.create({ data: { accountId: account.id, isBanned: false } }).catch(() => {});
        await db.telegramAccount.update({ where: { id: account.id }, data: { status: 'idle' } }).catch(() => {});
      }
      return {
        ok: true,
        isBanned: false,
        reason: '✅ سليم',
        details: { isPremium: me.premium || false, isRestricted: false },
      };
    }
  } catch (e: any) {
    try { await client.disconnect(); } catch {}
    return { ok: true, isBanned: true, banType: 'session_invalid', reason: '⏱️ فشل الفحص' };
  }
}

export async function checkAllUserAccounts(userId: string, isOwner: boolean = false) {
  const where = isOwner
    ? { sessionString: { not: null } }
    : { ownerId: userId, sessionString: { not: null } };

  const accounts = await db.telegramAccount.findMany({
    where,
    select: { phone: true, id: true, fullName: true, ownerId: true },
  });

  const results: { phone: string; result: BanCheckResult }[] = [];
  for (const acc of accounts) {
    const result = await quickCheckBan(acc.phone);
    results.push({ phone: acc.phone, result });
    if (result.ok) {
      await db.telegramAccount.update({
        where: { id: acc.id },
        data: { status: result.isBanned ? 'banned' : 'idle' },
      }).catch(() => {});
    }
  }

  return {
    total: accounts.length,
    banned: results.filter((r) => r.result.isBanned).length,
    healthy: results.filter((r) => !r.result.isBanned && r.result.ok).length,
    failed: results.filter((r) => !r.result.ok).length,
    results,
  };
}

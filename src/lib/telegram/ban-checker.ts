/**
 * lib/telegram/ban-checker.ts — MINIMAL & FAST ban check
 * =========================================================================
 * Only 2 checks, both fast:
 * 1. getMe (2s) — detects deactivated
 * 2. Try messaging @durov (real user, NOT bot) (3s) — detects PEER_FLOOD
 * Total: ~5-7s (within Vercel 10s limit)
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
  };
}

export async function checkBan(phone: string): Promise<BanCheckResult> {
  return quickCheckBan(phone);
}

export async function quickCheckBan(phone: string): Promise<BanCheckResult> {
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
    if (msg.includes('TIMEOUT')) return { ok: true, isBanned: true, banType: 'session_invalid', reason: '⏱️ انتهى وقت الاتصال' };
    return { ok: true, isBanned: true, banType: 'session_invalid', reason: '⏱️ فشل الاتصال: ' + msg.substring(0, 40) };
  }

  try {
    // CHECK 1: getMe (quick, 2s)
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

    const details: any = { isPremium: me.premium || false };

    // CHECK 2: SPAM RESTRICTION — ImportContacts test
    // When a spam-restricted account tries to import a stranger's phone as contact,
    // Telegram returns PEER_FLOOD. This is the safest test — no message sent.
    try {
      // Use a random phone number that's definitely not in contacts
      const testPhone = '+1555000' + Math.floor(Math.random() * 90000 + 10000);
      const importResult = await client.invoke(new Api.contacts.ImportContacts({
        contacts: [new Api.InputPhoneContact({
          clientId: BigInt(1),
          phone: testPhone,
          firstName: 'Test',
          lastName: '',
        })],
      })) as any;

      // If we get here without PEER_FLOOD, account is NOT restricted
      details.canWrite = true;
      details.canAddToGroups = true;
      details.isRestricted = false;
    } catch (e: any) {
      const errStr = (e.message || String(e)).toUpperCase();

      if (errStr.includes('PEER_FLOOD') || errStr.includes('PEERFLOOD')) {
        // DEFINITIVE: account is spam-restricted
        await client.disconnect();

        const accountId = (await db.telegramAccount.findUnique({ where: { phone } }))?.id;
        if (accountId) {
          await db.telegramAccount.update({ where: { id: accountId }, data: { status: 'banned' } }).catch(() => {});
        }

        return {
          ok: true,
          isBanned: true,
          banType: 'spam_restricted',
          reason: '🟠 تقييد سبام — لا يمكن إضافة جهات اتصال (PEER_FLOOD)',
          details: {
            ...details,
            isRestricted: true,
            canWrite: false,
            canAddToGroups: false,
          },
        };
      }

      // Other errors = probably fine
      details.canWrite = true;
      details.canAddToGroups = true;
      details.isRestricted = false;
    }

    // CHECK 3: Quick DB history check (0s — no API call)
    const accountId = (await db.telegramAccount.findUnique({ where: { phone } }))?.id;
    if (accountId) {
      const floodCount = await db.commandExecution.count({
        where: {
          accountId,
          status: 'error',
          output: { contains: 'PEER_FLOOD' },
          executedAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });
      details.recentFloodWaits = floodCount;

      if (floodCount > 0) {
        await client.disconnect();
        await db.telegramAccount.update({ where: { id: accountId }, data: { status: 'banned' } }).catch(() => {});
        return {
          ok: true,
          isBanned: true,
          banType: 'spam_restricted',
          reason: `🟠 تقييد سبام (${floodCount} PEER_FLOOD في 24 ساعة)`,
          details: { ...details, isRestricted: true },
        };
      }
    }

    // ALL CHECKS PASSED
    await client.disconnect();
    if (accountId) {
      await db.banCheck.create({ data: { accountId, isBanned: false } }).catch(() => {});
      await db.telegramAccount.update({ where: { id: accountId }, data: { status: 'idle' } }).catch(() => {});
    }

    return {
      ok: true,
      isBanned: false,
      details,
      reason: '✅ سليم — يمكن مراسلة الغرباء',
    };
  } catch (e: any) {
    try { await client.disconnect(); } catch {}
    return { ok: true, isBanned: true, banType: 'session_invalid', reason: '⏱️ فشل الفحص: ' + (e.message || '').substring(0, 50) };
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

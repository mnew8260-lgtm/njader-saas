/**
 * lib/telegram/ban-checker.ts — Accurate spam restriction detection
 * =========================================================================
 * KEY INSIGHT: Bots (@BotFather) are EXEMPT from spam restrictions.
 * Only REAL USERS trigger PEER_FLOOD for restricted accounts.
 *
 * SOLUTION: Use another account from the SAME USER as test target.
 * - Import their phone as contact → try to send message
 * - If PEER_FLOOD → account IS restricted
 * - If success or other error → NOT restricted
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
    canWriteToStranger?: boolean;
    isRestricted?: boolean;
    isPremium?: boolean;
    sessionsCount?: number;
    recentFloodWaits?: number;
    restrictionReason?: string;
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
      setTimeout(() => reject(new Error('CONNECTION_TIMEOUT')), 6000)
    );
    ({ client } = await Promise.race([connectPromise, timeoutPromise]));
  } catch (e: any) {
    const msg = e.message || String(e);
    if (msg.includes('AUTH_KEY_UNREGISTERED') || msg.includes('AUTH_KEY_INVALID')) {
      return { ok: true, isBanned: true, banType: 'auth_failed', reason: '🔑 الجلسة منتهية' };
    }
    if (msg.includes('USER_DEACTIVATED')) {
      return { ok: true, isBanned: true, banType: 'deactivated', reason: '🚫 معطّل نهائياً' };
    }
    if (msg.includes('CONNECTION_TIMEOUT')) {
      return { ok: true, isBanned: true, banType: 'session_invalid', reason: '⏱️ انتهى وقت الاتصال' };
    }
    return { ok: false, isBanned: false, reason: 'فشل الاتصال: ' + msg.substring(0, 60) };
  }

  const details: BanCheckResult['details'] = {};

  try {
    // ═══ CHECK 1: getMe ═══
    let me: any = null;
    try {
      me = await client.getMe();
      details.isPremium = me?.premium || false;
    } catch (e: any) {
      const errStr = e.message || String(e);
      if (errStr.includes('USER_DEACTIVATED')) {
        await client.disconnect();
        return { ok: true, isBanned: true, banType: 'deactivated', reason: '🚫 معطّل نهائياً' };
      }
      if (errStr.includes('AUTH_KEY_UNREGISTERED') || errStr.includes('SESSION_REVOKED')) {
        await client.disconnect();
        return { ok: true, isBanned: true, banType: 'auth_failed', reason: '🔑 الجلسة منتهية' };
      }
    }
    if (!me) {
      await client.disconnect();
      return { ok: true, isBanned: true, banType: 'deactivated', reason: '🚫 تعذّر جلب المعلومات' };
    }

    // ═══ CHECK 2: SPAM RESTRICTION — REAL USER MESSAGE TEST ═══
    // Find another account from the same user to use as test target
    const currentAccount = await db.telegramAccount.findUnique({
      where: { phone },
      select: { id: true, ownerId: true },
    });

    let testTargetPhone: string | null = null;
    if (currentAccount?.ownerId) {
      const otherAccounts = await db.telegramAccount.findMany({
        where: {
          ownerId: currentAccount.ownerId,
          id: { not: currentAccount.id },
          phone: { not: phone },
        },
        select: { phone: true },
        take: 1,
      });
      if (otherAccounts.length > 0) {
        testTargetPhone = otherAccounts[0].phone;
      }
    }

    if (testTargetPhone) {
      // Import the other account's phone as a contact
      try {
        const importResult = await client.invoke(new Api.contacts.ImportContacts({
          contacts: [new Api.InputPhoneContact({
            clientId: BigInt(1),
            phone: testTargetPhone,
            firstName: 'Test',
            lastName: '',
          })],
        })) as any;

        const importedUser = importResult?.users?.[0];

        if (importedUser) {
          // Try to send a message to this REAL USER
          try {
            const testMsg = await client.sendMessage(importedUser, {
              message: 'njadder_check_' + Date.now(),
              silent: true,
            });

            // Success! Can message strangers → NOT restricted
            details.canWriteToStranger = true;
            details.canAddToGroups = true;
            details.isRestricted = false;

            // Delete the message
            if (testMsg?.id) {
              try { await client.deleteMessages(importedUser, [testMsg.id], { revoke: true }); } catch {}
            }
          } catch (e: any) {
            const errStr = (e.message || String(e)).toUpperCase();

            if (errStr.includes('PEER_FLOOD') || errStr.includes('PEERFLOOD')) {
              // PEER_FLOOD = DEFINITIVE spam restriction
              await client.disconnect();
              return {
                ok: true,
                isBanned: true,
                banType: 'spam_restricted',
                reason: '🟠 تقييد سبام — لا يمكن مراسلة الغرباء (PEER_FLOOD)',
                details: {
                  ...details,
                  isRestricted: true,
                  canWriteToStranger: false,
                  canAddToGroups: false,
                  restrictionReason: 'تم تقييد الحساب من مراسلة من لا يملك رقم هاتفك',
                },
              };
            }

            // Other errors (privacy, etc.) = probably not restricted
            details.canWriteToStranger = true;
            details.canAddToGroups = true;
            details.isRestricted = false;
          }
        }
      } catch {
        // Import failed — skip
      }
    }

    // ═══ CHECK 3: sendMessage('me') — write ban detection ═══
    try {
      const testResult = await client.sendMessage('me', {
        message: 'njadder_check_' + Date.now(),
        silent: true,
      });
      details.canWrite = true;
      if (testResult?.id) {
        try { await client.deleteMessages('me', [testResult.id], { revoke: true }); } catch {}
      }
    } catch (e: any) {
      const errStr = e.message || String(e);
      details.canWrite = false;
      await client.disconnect();

      if (errStr.includes('PEER_FLOOD')) {
        return { ok: true, isBanned: true, banType: 'spam_restricted', reason: '🟠 تقييد سبام (PEER_FLOOD)', details: { ...details, isRestricted: true } };
      }
      if (errStr.includes('FLOOD_WAIT')) {
        const match = errStr.match(/(\d+)/);
        const sec = match ? parseInt(match[1], 10) : 60;
        return { ok: true, isBanned: true, banType: 'limited', reason: '⏱️ FloodWait ' + sec + 's', details: { ...details } };
      }
      if (errStr.includes('SPAMMER')) {
        return { ok: true, isBanned: true, banType: 'spam_ban', reason: '🚫 مُصنّف كسبام', details };
      }
      return { ok: true, isBanned: true, banType: 'write_banned', reason: '📝 لا يستطيع الكتابة', details };
    }

    // ═══ CHECK 4: DB FloodWait history (fast) ═══
    const accountId = (await db.telegramAccount.findUnique({ where: { phone } }))?.id;
    if (accountId) {
      const recentErrors = await db.commandExecution.findMany({
        where: {
          accountId,
          status: 'error',
          executedAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        select: { output: true },
        take: 50,
      });

      const floodErrors = recentErrors.filter((e) =>
        (e.output || '').includes('FLOOD') ||
        (e.output || '').includes('PEER_FLOOD') ||
        (e.output || '').includes('PeerFlood')
      );
      details.recentFloodWaits = floodErrors.length;

      const peerFloodErrors = recentErrors.filter((e) =>
        (e.output || '').includes('PEER_FLOOD') ||
        (e.output || '').includes('PeerFlood')
      );

      if (peerFloodErrors.length > 0) {
        await client.disconnect();
        return {
          ok: true,
          isBanned: true,
          banType: 'spam_restricted',
          reason: '🟠 تقييد سبام (PEER_FLOOD في التاريخ)',
          details: { ...details, isRestricted: true, canAddToGroups: false, canWriteToStranger: false },
        };
      }

      if (floodErrors.length >= 3) {
        await client.disconnect();
        return { ok: true, isBanned: true, banType: 'limited', reason: `⏱️ ${floodErrors.length} FloodWait في 24 ساعة`, details };
      }
      if (floodErrors.length >= 1) {
        await client.disconnect();
        return { ok: true, isBanned: true, banType: 'limited', reason: '⏱️ FloodWait في 24 ساعة', details };
      }
    }

    // ═══ ALL CHECKS PASSED ═══
    await client.disconnect();
    if (accountId) {
      await db.banCheck.create({ data: { accountId, isBanned: false } }).catch(() => {});
      await db.telegramAccount.update({ where: { id: accountId }, data: { status: 'idle' } }).catch(() => {});
    }

    return {
      ok: true,
      isBanned: false,
      details,
      reason: '✅ سليم — يمكن الكتابة + لا FloodWait',
    };
  } catch (e: any) {
    try { await client.disconnect(); } catch {}
    return { ok: false, isBanned: false, reason: e.message };
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

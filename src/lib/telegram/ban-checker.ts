/**
 * lib/telegram/ban-checker.ts — Fast & accurate ban check
 * =========================================================================
 * Priority order (most important checks FIRST to fit Vercel 10s limit):
 * 1. Connection + getMe — detects deactivated/auth failures
 * 2. GROUP INVITE TEST — detects spam restriction (PEER_FLOOD)
 * 3. sendMessage('me') — detects write bans
 * 4. DB FloodWait history — detects recent limits (fast, no API call)
 */

import { TelegramClient, Api } from 'telegram';
import { db } from '@/lib/db';
import { makeClient } from '@/lib/telegram/client';

export interface BanCheckResult {
  ok: boolean;
  isBanned: boolean;
  banType?: string;
  reason?: string;
  limitedUntil?: Date;
  details?: {
    canRead?: boolean;
    canWrite?: boolean;
    canInteract?: boolean;
    canResolve?: boolean;
    canWriteToStranger?: boolean;
    canAddToGroups?: boolean;
    has2FA?: boolean;
    sessionsCount?: number;
    floodWaitSeconds?: number;
    isPremium?: boolean;
    recentFloodWaits?: number;
    restrictionReason?: string;
    isRestricted?: boolean;
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
      return { ok: true, isBanned: true, banType: 'auth_failed', reason: '🔑 الجلسة منتهية — الحساب محظور أو تم تسجيل خروجه' };
    }
    if (msg.includes('USER_DEACTIVATED')) {
      return { ok: true, isBanned: true, banType: 'deactivated', reason: '🚫 الحساب معطّل نهائياً' };
    }
    if (msg.includes('CONNECTION_TIMEOUT') || msg.includes('PROXY_TIMEOUT')) {
      return { ok: true, isBanned: true, banType: 'session_invalid', reason: '⏱️ انتهى وقت الاتصال — الجلسة غير صالحة أو محظورة' };
    }
    return { ok: false, isBanned: false, reason: 'فشل الاتصال: ' + msg.substring(0, 60) };
  }

  const details: BanCheckResult['details'] = {};

  try {
    // ═══ CHECK 1: getMe — quick, detects deactivated accounts ═══
    let me: any = null;
    try {
      me = await client.getMe();
      details.isPremium = me?.premium || false;
    } catch (e: any) {
      const errStr = e.message || String(e);
      if (errStr.includes('USER_DEACTIVATED')) {
        await client.disconnect();
        return { ok: true, isBanned: true, banType: 'deactivated', reason: '🚫 معطّل نهائياً', details };
      }
      if (errStr.includes('AUTH_KEY_UNREGISTERED') || errStr.includes('SESSION_REVOKED')) {
        await client.disconnect();
        return { ok: true, isBanned: true, banType: 'auth_failed', reason: '🔑 الجلسة منتهية', details };
      }
    }

    if (!me) {
      await client.disconnect();
      return { ok: true, isBanned: true, banType: 'deactivated', reason: '🚫 تعذّر جلب معلومات الحساب', details };
    }

    // ═══ CHECK 2: SPAM RESTRICTION — GROUP INVITE TEST (THE KEY CHECK) ═══
    // This is the MOST IMPORTANT check — do it FIRST after getMe
    // Telegram says: "لا إضافتهم إلى المجموعات والقنوات"
    // So we create a temp channel + try to invite → PEER_FLOOD = restricted
    try {
      const createResult = await client.invoke(new Api.channels.CreateChannel({
        title: 'njadder_check_' + Date.now(),
        about: 'temp',
        megagroup: false,
      })) as any;

      const channelId = createResult?.chats?.[0]?.id;
      const channelAccessHash = createResult?.chats?.[0]?.accessHash;

      if (channelId && channelAccessHash) {
        const channel = new Api.InputChannel({
          channelId: BigInt(channelId),
          accessHash: BigInt(channelAccessHash),
        });

        try {
          // Try to invite @BotFather (ID: 93372553) to the channel
          await client.invoke(new Api.channels.InviteToChannel({
            channel,
            users: [new Api.InputUser({ userId: BigInt(93372553), accessHash: BigInt(0) })],
          }));

          // Success! Account CAN invite → NOT restricted
          details.canAddToGroups = true;
          details.canWriteToStranger = true;
          details.isRestricted = false;
        } catch (e: any) {
          const errStr = (e.message || String(e)).toUpperCase();

          if (errStr.includes('PEER_FLOOD') || errStr.includes('PEERFLOOD')) {
            // Delete temp channel
            try { await client.invoke(new Api.channels.DeleteChannel({ channel })); } catch {}

            await client.disconnect();
            return {
              ok: true,
              isBanned: true,
              banType: 'spam_restricted',
              reason: '🟠 تقييد سبام — لا يمكن إضافة أعضاء للمجموعات (PEER_FLOOD)',
              details: {
                ...details,
                isRestricted: true,
                canWriteToStranger: false,
                canAddToGroups: false,
                restrictionReason: 'تم تقييد الحساب من إضافة الأعضاء للمجموعات والقنوات',
              },
            };
          }

          // Other errors (USER_ALREADY_PARTICIPANT, BOT_PRIVACY, etc.) = NOT restricted
          details.canAddToGroups = true;
          details.canWriteToStranger = true;
          details.isRestricted = false;
        }

        // Delete the temporary channel
        try { await client.invoke(new Api.channels.DeleteChannel({ channel })); } catch {}
      }
    } catch {
      // Channel creation failed — skip
    }

    // ═══ CHECK 3: sendMessage('me') — detects write bans ═══
    try {
      const testResult = await client.sendMessage('me', {
        message: 'njadder_check_' + Date.now(),
        silent: true,
      });
      details.canWrite = true;
      if (testResult && (testResult as any).id) {
        try { await client.deleteMessages('me', [(testResult as any).id], { revoke: true }); } catch {}
      }
    } catch (e: any) {
      const errStr = e.message || String(e);
      details.canWrite = false;
      await client.disconnect();

      if (errStr.includes('PEER_FLOOD')) {
        return { ok: true, isBanned: true, banType: 'spam_restricted', reason: '🟠 تقييد سبام (PEER_FLOOD)', details: { ...details, isRestricted: true, canAddToGroups: false } };
      }
      if (errStr.includes('FLOOD_WAIT')) {
        const match = errStr.match(/(\d+)/);
        const sec = match ? parseInt(match[1], 10) : 60;
        return { ok: true, isBanned: true, banType: 'limited', reason: '⏱️ FloodWait ' + sec + 's', limitedUntil: new Date(Date.now() + sec * 1000), details: { ...details, floodWaitSeconds: sec } };
      }
      if (errStr.includes('SPAMMER') || errStr.includes('SPAM')) {
        return { ok: true, isBanned: true, banType: 'spam_ban', reason: '🚫 مُصنّف كسبام', details };
      }
      return { ok: true, isBanned: true, banType: 'write_banned', reason: '📝 لا يستطيع الكتابة: ' + errStr.substring(0, 50), details };
    }

    // ═══ CHECK 4: DB FloodWait history (fast, no API call) ═══
    const accountId = (await db.telegramAccount.findUnique({ where: { phone } }))?.id;
    if (accountId) {
      const recentErrors = await db.commandExecution.findMany({
        where: {
          accountId,
          status: 'error',
          executedAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        orderBy: { executedAt: 'desc' },
        take: 50,
        select: { output: true },
      });

      const floodErrors = recentErrors.filter((e) =>
        (e.output || '').includes('FLOOD') ||
        (e.output || '').includes('FloodWait') ||
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
          reason: '🟠 تقييد سبام (PEER_FLOOD في التاريخ) — مُقيّد من إضافة الأعضاء',
          details: { ...details, isRestricted: true, canAddToGroups: false, canWriteToStranger: false },
        };
      }

      if (floodErrors.length >= 3) {
        await client.disconnect();
        return {
          ok: true,
          isBanned: true,
          banType: 'limited',
          reason: `⏱️ ${floodErrors.length} أخطاء FloodWait في آخر 24 ساعة — محدود جداً`,
          details: { ...details, floodWaitSeconds: 300 },
        };
      }

      if (floodErrors.length >= 1) {
        await client.disconnect();
        return {
          ok: true,
          isBanned: true,
          banType: 'limited',
          reason: `⏱️ خطأ FloodWait في آخر 24 ساعة — محدود مؤقتاً`,
          details: { ...details, floodWaitSeconds: 60 },
        };
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
      details: {
        ...details,
        canInteract: details.canAddToGroups !== false,
      },
      reason: details.isRestricted === false
        ? '✅ سليم تماماً — يمكن الكتابة + إضافة أعضاء + لا FloodWait'
        : '✅ سليم',
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

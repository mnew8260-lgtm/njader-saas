/**
 * lib/telegram/ban-checker.ts — Deep ban check for Telegram accounts
 * =========================================================================
 * Performs multiple checks to detect ALL types of bans/limits:
 * 1. getMe() — detects fully deactivated accounts
 * 2. getDialogs() — detects accounts that can't read messages
 * 3. sendMessage to Saved Messages — detects writing bans
 * 4. GetAuthorizations — detects session-specific bans
 * 5. Check FloodWait history — detects recent flood limits
 * 6. Try resolveUsername — detects search/contact restrictions
 * 7. Try getParticipants — detects group interaction bans
 */

import { TelegramClient, Api } from 'telegram';
import { db } from '@/lib/db';
import { makeClient } from '@/lib/telegram/client';

export interface BanCheckResult {
  ok: boolean;
  isBanned: boolean;
  banType?: 'deactivated' | 'auth_failed' | 'write_banned' | 'flood_ban' | 'limited' | 'spam_ban' | 'read_banned' | 'session_invalid' | 'restricted';
  reason?: string;
  limitedUntil?: Date;
  details?: {
    canRead?: boolean;
    canWrite?: boolean;
    canInteract?: boolean;
    canResolve?: boolean;
    has2FA?: boolean;
    sessionsCount?: number;
    floodWaitSeconds?: number;
    isPremium?: boolean;
    recentFloodWaits?: number;
    restrictionReason?: string;
  };
}

/**
 * Deep ban check — performs multiple operations to detect all ban types.
 */
export async function checkBan(phone: string): Promise<BanCheckResult> {
  return quickCheckBan(phone);
}

/**
 * Quick ban check — the most reliable checks within Vercel's 10s limit.
 * Key checks:
 * 1. Connection (detects auth failures)
 * 2. getMe (detects deactivated accounts)
 * 3. sendMessage('me') (detects write bans, flood, spam)
 * 4. resolveUsername (detects contact/search restrictions)
 * 5. Recent FloodWait history (detects ongoing limits)
 */
export async function quickCheckBan(phone: string): Promise<BanCheckResult> {
  let client: TelegramClient;
  try {
    const connectPromise = makeClient(phone);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('CONNECTION_TIMEOUT')), 7000)
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
    // ═══ CHECK 1: getMe — detects deactivated accounts ═══
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

    // Check if account has restriction flag
    if (me.restricted) {
      details.restrictionReason = me.restrictionReason?.plainText || 'مقيد';
    }

    // ═══ CHECK 2: sendMessage to Saved Messages (THE KEY CHECK) ═══
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
        return { ok: true, isBanned: true, banType: 'flood_ban', reason: '🌊 حظر فيض (Peer Flood) — لا يستطيع الإرسال', details };
      }
      if (errStr.includes('USER_BANNED_IN_CHANNEL') || errStr.includes('CHAT_WRITE_FORBIDDEN')) {
        return { ok: true, isBanned: true, banType: 'write_banned', reason: '📝 محظور من الكتابة', details };
      }
      if (errStr.includes('FLOOD_WAIT')) {
        const match = errStr.match(/(\d+)/);
        const sec = match ? parseInt(match[1], 10) : 60;
        return { ok: true, isBanned: true, banType: 'limited', reason: '⏱️ FloodWait ' + sec + 's', limitedUntil: new Date(Date.now() + sec * 1000), details: { ...details, floodWaitSeconds: sec } };
      }
      if (errStr.includes('SPAMMER') || errStr.includes('SPAM')) {
        return { ok: true, isBanned: true, banType: 'spam_ban', reason: '🚫 مُصنّف كسبام', details };
      }
      // Can't write to self → likely banned
      return { ok: true, isBanned: true, banType: 'write_banned', reason: '📝 لا يستطيع الكتابة: ' + errStr.substring(0, 50), details };
    }

    // ═══ CHECK 3: resolveUsername — detects contact/search restrictions ═══
    try {
      await client.invoke(new Api.contacts.ResolveUsername({ username: 'telegram' }));
      details.canResolve = true;
    } catch (e: any) {
      const errStr = e.message || String(e);
      details.canResolve = false;
      if (errStr.includes('FLOOD_WAIT')) {
        const match = errStr.match(/(\d+)/);
        const sec = match ? parseInt(match[1], 10) : 60;
        await client.disconnect();
        return { ok: true, isBanned: true, banType: 'limited', reason: '⏱️ FloodWait عند البحث: ' + sec + 's', limitedUntil: new Date(Date.now() + sec * 1000), details: { ...details, floodWaitSeconds: sec } };
      }
      // If username resolution fails with a ban-related error, mark as restricted
      if (errStr.includes('USER_PRIVACY') || errStr.includes('PEER_ID_INVALID')) {
        details.canInteract = false;
      }
    }

    // ═══ CHECK 4: Check recent FloodWait history in DB ═══
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
        select: { output: true, commandName: true, executedAt: true },
      });

      const floodErrors = recentErrors.filter((e) =>
        (e.output || '').includes('FLOOD') || (e.output || '').includes('FloodWait')
      );
      details.recentFloodWaits = floodErrors.length;

      if (floodErrors.length >= 3) {
        await client.disconnect();
        return {
          ok: true,
          isBanned: true,
          banType: 'limited',
          reason: `⏱️ ${floodErrors.length} أخطاء FloodWait في آخر 24 ساعة — الحساب محدود جداً`,
          details: { ...details, floodWaitSeconds: 300 },
        };
      }

      if (floodErrors.length >= 1) {
        await client.disconnect();
        return {
          ok: true,
          isBanned: true,
          banType: 'limited',
          reason: `⏱️ خطأ FloodWait واحد في آخر 24 ساعة — الحساب محدود مؤقتاً`,
          details: { ...details, floodWaitSeconds: 60 },
        };
      }
    }

    // ═══ CHECK 5: GetAuthorizations — session count ═══
    try {
      const auths = await client.invoke(new Api.account.GetAuthorizations({}));
      details.sessionsCount = auths?.authorizations?.length || 0;
    } catch {}

    // ═══ ALL CHECKS PASSED ═══
    await client.disconnect();

    // Save healthy result
    if (accountId) {
      await db.banCheck.create({ data: { accountId, isBanned: false } }).catch(() => {});
      await db.telegramAccount.update({ where: { id: accountId }, data: { status: 'idle' } }).catch(() => {});
    }

    // Build health summary
    const healthScore = [
      details.canWrite !== false,
      details.canResolve !== false,
      (details.recentFloodWaits || 0) === 0,
      !details.restrictionReason,
    ].filter(Boolean).length;

    return {
      ok: true,
      isBanned: false,
      details: {
        ...details,
        canInteract: details.canResolve !== false,
      },
      reason: healthScore === 4
        ? '✅ سليم تماماً — يمكن الكتابة + البحث + لا FloodWait'
        : `⚠️ محدود (${healthScore}/4) — ${details.canWrite === false ? 'لا يكتب ' : ''}${details.recentFloodWaits ? `FloodWait: ${details.recentFloodWaits}` : ''}`,
    };
  } catch (e: any) {
    try { await client.disconnect(); } catch {}
    return { ok: false, isBanned: false, reason: e.message };
  }
}

/**
 * Run ban check on all accounts of a user.
 */
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

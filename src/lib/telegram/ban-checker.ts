/**
 * lib/telegram/ban-checker.ts — Deep ban check for Telegram accounts
 * =========================================================================
 * Performs multiple checks to detect ALL types of bans/limits:
 * 1. getMe() — detects fully deactivated accounts
 * 2. getDialogs() — detects accounts that can't read messages
 * 3. sendMessage to Saved Messages — detects writing bans
 * 4. GetAuthorizations — detects session-specific bans
 * 5. Check FloodWait history — detects recent flood limits
 */

import { TelegramClient, Api } from 'telegram';
import { db } from '@/lib/db';
import { makeClient } from '@/lib/telegram/client';

export interface BanCheckResult {
  ok: boolean;
  isBanned: boolean;
  banType?: 'deactivated' | 'auth_failed' | 'write_banned' | 'flood_ban' | 'limited' | 'spam_ban' | 'read_banned' | 'session_invalid';
  reason?: string;
  limitedUntil?: Date;
  details?: {
    canRead?: boolean;
    canWrite?: boolean;
    has2FA?: boolean;
    sessionsCount?: number;
    floodWaitSeconds?: number;
    isPremium?: boolean;
  };
}

/**
 * Deep ban check — performs multiple operations to detect all ban types.
 */
export async function checkBan(phone: string): Promise<BanCheckResult> {
  let client: TelegramClient;
  try {
    ({ client } = await makeClient(phone));
  } catch (e: any) {
    const msg = e.message || String(e);
    // Connection errors often mean the session is invalid/banned
    if (msg.includes('AUTH_KEY_UNREGISTERED') || msg.includes('AUTH_KEY_INVALID')) {
      return {
        ok: true,
        isBanned: true,
        banType: 'auth_failed',
        reason: '🔑 الجلسة غير صالحة — الحساب تم تسجيل خروجه أو حظره',
      };
    }
    if (msg.includes('USER_DEACTIVATED') || msg.includes('USER_DEACTIVATED_PROTECT')) {
      return {
        ok: true,
        isBanned: true,
        banType: 'deactivated',
        reason: '🚫 الحساب تم تعطيله نهائياً من تيليجرام',
      };
    }
    return { ok: false, isBanned: false, reason: `فشل الاتصال: ${msg.substring(0, 80)}` };
  }

  const details: BanCheckResult['details'] = {};

  try {
    // ═══════════════════════════════════════════════════════════
    // CHECK 1: getMe() — detects fully deactivated accounts
    // ═══════════════════════════════════════════════════════════
    let me: any = null;
    try {
      me = await client.getMe();
      details.isPremium = me?.premium || false;
    } catch (e: any) {
      const errStr = e.message || String(e);

      if (errStr.includes('USER_DEACTIVATED') || errStr.includes('USER_DEACTIVATED_PROTECT')) {
        await client.disconnect();
        return {
          ok: true,
          isBanned: true,
          banType: 'deactivated',
          reason: '🚫 الحساب تم تعطيله نهائياً من تيليجرام',
          details,
        };
      }
      if (errStr.includes('AUTH_KEY_UNREGISTERED') || errStr.includes('SESSION_REVOKED')) {
        await client.disconnect();
        return {
          ok: true,
          isBanned: true,
          banType: 'auth_failed',
          reason: '🔑 الجلسة منتهية — الحساب تم تسجيل خروجه من جهاز آخر',
          details,
        };
      }
      if (errStr.includes('USER_BANNED_IN_CHANNEL')) {
        await client.disconnect();
        return {
          ok: true,
          isBanned: true,
          banType: 'write_banned',
          reason: '📝 الحساب محظور من الكتابة في القنوات',
          details,
        };
      }
    }

    if (!me) {
      await client.disconnect();
      return {
        ok: true,
        isBanned: true,
        banType: 'deactivated',
        reason: '🚫 تعذّر جلب معلومات الحساب — محتمل تعطيل',
        details,
      };
    }

    // ═══════════════════════════════════════════════════════════
    // CHECK 2: getDialogs() — detects accounts that can't read messages
    // ═══════════════════════════════════════════════════════════
    try {
      const dialogs = await client.getDialogs({ limit: 1 });
      details.canRead = true;
    } catch (e: any) {
      const errStr = e.message || String(e);
      details.canRead = false;

      if (errStr.includes('PEER_FLOOD')) {
        await client.disconnect();
        return {
          ok: true,
          isBanned: true,
          banType: 'flood_ban',
          reason: '🌊 حظر فيض (Peer Flood) — تيليجرام حظر الحساب بسبب إرسال مكثف',
          details,
        };
      }
      if (errStr.includes('FLOOD_WAIT')) {
        const match = errStr.match(/(\d+)/);
        const sec = match ? parseInt(match[1], 10) : 60;
        await client.disconnect();
        return {
          ok: true,
          isBanned: true,
          banType: 'limited',
          reason: `⏱️ FloodWait ${sec} ثانية — الحساب محدود مؤقتاً`,
          limitedUntil: new Date(Date.now() + sec * 1000),
          details: { ...details, floodWaitSeconds: sec },
        };
      }
    }

    // ═══════════════════════════════════════════════════════════
    // CHECK 3: SendMessage to "Saved Messages" (self) — detects write bans
    // This is the most reliable check: if you can't message yourself, you're banned
    // ═══════════════════════════════════════════════════════════
    try {
      // Try to send a test message to Saved Messages (self)
      const testResult = await client.sendMessage('me', {
        message: 'njadder_health_check_' + Date.now(),
        silent: true,  // Don't notify
      });
      details.canWrite = true;

      // Delete the test message immediately
      if (testResult && (testResult as any).id) {
        try {
          await client.deleteMessages('me', [(testResult as any).id], { revoke: true });
        } catch {}
      }
    } catch (e: any) {
      const errStr = e.message || String(e);
      details.canWrite = false;

      if (errStr.includes('PEER_FLOOD')) {
        await client.disconnect();
        return {
          ok: true,
          isBanned: true,
          banType: 'flood_ban',
          reason: '🌊 حظر فيض — الحساب لا يستطيع إرسال رسائل (Peer Flood)',
          details,
        };
      }
      if (errStr.includes('USER_BANNED_IN_CHANNEL')) {
        await client.disconnect();
        return {
          ok: true,
          isBanned: true,
          banType: 'write_banned',
          reason: '📝 محظور من الكتابة — الحساب لا يستطيع إرسال رسائل',
          details,
        };
      }
      if (errStr.includes('CHAT_WRITE_FORBIDDEN') || errStr.includes('WRITE_FORBIDDEN')) {
        await client.disconnect();
        return {
          ok: true,
          isBanned: true,
          banType: 'write_banned',
          reason: '📝 ممنوع من الكتابة — الحساب محظور من الإرسال',
          details,
        };
      }
      if (errStr.includes('FLOOD_WAIT')) {
        const match = errStr.match(/(\d+)/);
        const sec = match ? parseInt(match[1], 10) : 60;
        await client.disconnect();
        return {
          ok: true,
          isBanned: true,
          banType: 'limited',
          reason: `⏱️ FloodWait ${sec} ثانية — الحساب محدود مؤقتاً من الكتابة`,
          limitedUntil: new Date(Date.now() + sec * 1000),
          details: { ...details, floodWaitSeconds: sec },
        };
      }
      if (errStr.includes('SPAMMER')) {
        await client.disconnect();
        return {
          ok: true,
          isBanned: true,
          banType: 'spam_ban',
          reason: '🚫 مُصنّف كسبام — تيليجرام حظر الحساب بسبب النشاط المشبوه',
          details,
        };
      }
      // If we can't send to self but no specific ban error, it's suspicious
      if (!details.canRead) {
        await client.disconnect();
        return {
          ok: true,
          isBanned: true,
          banType: 'read_banned',
          reason: '⚠️ الحساب لا يستطيع القراءة أو الكتابة — محتمل حظر كامل',
          details,
        };
      }
    }

    // ═══════════════════════════════════════════════════════════
    // CHECK 4: GetAuthorizations — detect session count
    // ═══════════════════════════════════════════════════════════
    try {
      const auths = await client.invoke(new Api.account.GetAuthorizations({}));
      details.sessionsCount = auths?.authorizations?.length || 0;
    } catch {}

    // ═══════════════════════════════════════════════════════════
    // CHECK 5: GetPassword — check 2FA status
    // ═══════════════════════════════════════════════════════════
    try {
      const pwd = await client.invoke(new Api.account.GetPassword());
      details.has2FA = pwd?.hasPassword || false;
    } catch {}

    // ═══════════════════════════════════════════════════════════
    // CHECK 6: Check recent command execution history for FloodWait errors
    // ═══════════════════════════════════════════════════════════
    const accountId = (await db.telegramAccount.findUnique({ where: { phone } }))?.id;
    if (accountId) {
      const recentErrors = await db.commandExecution.findMany({
        where: {
          accountId,
          status: 'error',
          output: { contains: 'FLOOD' },
          executedAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // last 24h
        },
        orderBy: { executedAt: 'desc' },
        take: 1,
      });

      if (recentErrors.length > 0) {
        // Account had recent FloodWait — mark as limited
        await client.disconnect();
        return {
          ok: true,
          isBanned: true,
          banType: 'limited',
          reason: '⏱️ الحساب لديه أخطاء FloodWait في آخر 24 ساعة — محدود مؤقتاً',
          details: { ...details, floodWaitSeconds: 300 },
        };
      }
    }

    // ═══════════════════════════════════════════════════════════
    // ALL CHECKS PASSED — Account is healthy
    // ═══════════════════════════════════════════════════════════
    await client.disconnect();

    // Save healthy result to DB
    if (accountId) {
      await db.banCheck.create({
        data: { accountId, isBanned: false },
      }).catch(() => {});
    }

    return {
      ok: true,
      isBanned: false,
      details,
    };
  } catch (e: any) {
    try { await client.disconnect(); } catch {}
    return { ok: false, isBanned: false, reason: e.message };
  }
}

/**
 * Run deep ban check on all accounts of a user.
 */
export async function checkAllUserAccounts(userId: string) {
  const accounts = await db.telegramAccount.findMany({
    where: { ownerId: userId, sessionString: { not: null } },
    select: { phone: true, id: true },
  });

  const results: { phone: string; result: BanCheckResult }[] = [];
  for (const acc of accounts) {
    const result = await checkBan(acc.phone);
    results.push({ phone: acc.phone, result });

    // Update account status based on result
    if (result.ok) {
      await db.telegramAccount.update({
        where: { id: acc.id },
        data: { status: result.isBanned ? 'banned' : 'idle' },
      });
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

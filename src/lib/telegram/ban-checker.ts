/**
 * lib/telegram/ban-checker.ts — Exact Python v1.2.1 port
 * =========================================================================
 * TWO separate functions (like Python):
 * 1. checkBan() — just getMe() + catch ban errors (fast, 2-3s)
 * 2. limitCheckRemove() — walk @SpamBot conversation flow (slow, 10-15s)
 *
 * Python ban errors:
 *   UserDeactivated, UserDeactivatedBan, AuthKeyUnregistered,
 *   SessionRevoked, UserBannedInChannel
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
    isPremium?: boolean;
    recentPeerFloods?: number;
    recentFloodWaits?: number;
  };
}

// Python: SPAMBOT_USERNAME
const SPAMBOT = 'spambot';

// Python: _NO_LIMIT_MSG
const NO_LIMIT_MSG = "Good news, no limits are currently applied to your account. You're free as a bird!";

// Python: _HARSH_MSG
const HARSH_MSG = "Unfortunately, some phone numbers may trigger a harsh response from our anti-spam systems.";

// Python: _COMplaint_TEXT
const COMPLAINT_TEXT = "I'm a developer testing my application. I never sent any spam and would never do that. Please remove the limit.";

/**
 * CHECK 1: Basic ban check — just getMe() + catch ban errors
 * This is `check_banned_accounts_live` from Python.
 * Only detects: deactivated, auth_key invalid, session revoked.
 * Does NOT detect spam restrictions.
 */
export async function checkBan(phone: string): Promise<BanCheckResult> {
  return quickCheckBan(phone);
}

export async function quickCheckBan(phone: string): Promise<BanCheckResult> {
  // ═══ STEP 1: DB history check (instant, 0s) ═══
  const account = await db.telegramAccount.findUnique({
    where: { phone },
    select: { id: true, status: true },
  });

  if (account) {
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

    if (peerFloodErrors.length > 0) {
      return {
        ok: true,
        isBanned: true,
        banType: 'spam_restricted',
        reason: `🟠 مقيّد سبام — ${peerFloodErrors.length} PEER_FLOOD في 24 ساعة`,
        details: { recentPeerFloods: peerFloodErrors.length },
      };
    }

    if (account.status === 'banned') {
      return {
        ok: true,
        isBanned: true,
        banType: 'spam_restricted',
        reason: '🟠 مقيّد سبام (حالة محفوظة)',
        details: { recentPeerFloods: 0 },
      };
    }
  }

  // ═══ STEP 2: getMe() — like Python check_banned_accounts_live ═══
  let client: TelegramClient;
  try {
    const connectPromise = makeClient(phone);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('CONNECTION_TIMEOUT')), 5000)
    );
    ({ client } = await Promise.race([connectPromise, timeoutPromise]));
  } catch (e: any) {
    const msg = e.message || '';
    // Python: AuthKeyUnregistered
    if (msg.includes('AUTH_KEY') || msg.includes('AUTH_KEY_UNREGISTERED')) {
      return { ok: true, isBanned: true, banType: 'auth_failed', reason: '🔑 الجلسة منتهية — الحساب محظور أو تم تسجيل خروجه' };
    }
    // Python: SessionRevoked
    if (msg.includes('SESSION_REVOKED') || msg.includes('SESSION_REVOKED')) {
      return { ok: true, isBanned: true, banType: 'auth_failed', reason: '🔑 الجلسة منتهية — تم تسجيل الخروج من جهاز آخر' };
    }
    // Python: UserDeactivated
    if (msg.includes('USER_DEACTIVATED') || msg.includes('USER_DEACTIVATED_PROTECT')) {
      return { ok: true, isBanned: true, banType: 'deactivated', reason: '🚫 الحساب معطّل نهائياً من تيليجرام' };
    }
    if (msg.includes('TIMEOUT') || msg.includes('PROXY_TIMEOUT')) {
      return { ok: true, isBanned: true, banType: 'session_invalid', reason: '⏱️ انتهى وقت الاتصال — الجلسة غير صالحة' };
    }
    return { ok: true, isBanned: true, banType: 'session_invalid', reason: '⏱️ فشل الاتصال' };
  }

  try {
    // Python: app.get_me()
    const me = await client.getMe() as any;
    await client.disconnect();

    if (account) {
      await db.banCheck.create({ data: { accountId: account.id, isBanned: false } }).catch(() => {});
      await db.telegramAccount.update({ where: { id: account.id }, data: { status: 'idle' } }).catch(() => {});
    }

    return {
      ok: true,
      isBanned: false,
      reason: '✅ سليم',
      details: { isPremium: me?.premium || false, recentPeerFloods: 0 },
    };
  } catch (e: any) {
    try { await client.disconnect(); } catch {}
    const errStr = e.message || '';

    // Python: UserDeactivated
    if (errStr.includes('USER_DEACTIVATED') || errStr.includes('USER_DEACTIVATED_PROTECT')) {
      return { ok: true, isBanned: true, banType: 'deactivated', reason: '🚫 معطّل نهائياً' };
    }
    // Python: UserDeactivatedBan
    if (errStr.includes('USER_DEACTIVATED_BAN')) {
      return { ok: true, isBanned: true, banType: 'deactivated', reason: '🚫 معطّل وحظر نهائي' };
    }
    // Python: AuthKeyUnregistered
    if (errStr.includes('AUTH_KEY_UNREGISTERED') || errStr.includes('AUTH_KEY_INVALID')) {
      return { ok: true, isBanned: true, banType: 'auth_failed', reason: '🔑 الجلسة منتهية' };
    }
    // Python: SessionRevoked
    if (errStr.includes('SESSION_REVOKED')) {
      return { ok: true, isBanned: true, banType: 'auth_failed', reason: '🔑 الجلسة منتهية' };
    }
    // Python: UserBannedInChannel
    if (errStr.includes('USER_BANNED_IN_CHANNEL')) {
      return { ok: true, isBanned: true, banType: 'write_banned', reason: '📝 محظور من الكتابة في القنوات' };
    }

    return { ok: true, isBanned: true, banType: 'session_invalid', reason: '⏱️ فشل الفحص: ' + errStr.substring(0, 50) };
  }
}

/**
 * CHECK 2: @SpamBot walk — limit check + auto-complaint
 * This is `limit_check_and_remove` + `_spambot_walk` from Python.
 * Walks the @SpamBot conversation flow exactly like Python:
 * 1. Send /start
 * 2. Read response
 * 3. If "Good news, no limits" → account is fine
 * 4. If "Unfortunately, some phone numbers" → restricted
 *    → Send "This is a mistake" → "Yes" → "No, I'll never do this!" → complaint
 */
export async function limitCheckRemove(phone: string): Promise<BanCheckResult> {
  let client: TelegramClient;
  try {
    const connectPromise = makeClient(phone);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), 5000)
    );
    ({ client } = await Promise.race([connectPromise, timeoutPromise]));
  } catch (e: any) {
    return { ok: false, isBanned: false, reason: 'فشل الاتصال: ' + (e.message || '').substring(0, 50) };
  }

  try {
    // Python: await app.send_message(SPAMBOT_USERNAME, "/start")
    await client.sendMessage(SPAMBOT, { message: '/start' });
    await new Promise((r) => setTimeout(r, 2000));

    // Python: async for msg in app.get_chat_history(SPAMBOT_USERNAME, limit=1)
    const msgs = await client.getMessages(SPAMBOT, { limit: 1 });
    const text = (msgs[0] as any)?.message || '';

    // Python: if _NO_LIMIT_MSG in text
    if (text.includes(NO_LIMIT_MSG) || text.includes("free as a bird") || text.includes("no limits")) {
      // Python: await app.send_message(SPAMBOT, "Cool, thanks")
      try { await client.sendMessage(SPAMBOT, { message: 'Cool, thanks' }); } catch {}
      await client.disconnect();
      return {
        ok: true,
        isBanned: false,
        reason: '✅ سليم — @SpamBot أكد: لا توجد قيود',
        details: {},
      };
    }

    // Python: if _HARSH_MSG in text or "limited" in text.lower()
    if (text.includes(HARSH_MSG) || text.toLowerCase().includes('limited') ||
        text.includes('مقيّد') || text.includes('تقييد') || text.includes('anti-spam')) {

      // Python: await app.send_message(SPAMBOT, "This is a mistake")
      await client.sendMessage(SPAMBOT, { message: 'This is a mistake' });
      await new Promise((r) => setTimeout(r, 1500));

      // Read response
      const msgs2 = await client.getMessages(SPAMBOT, { limit: 1 });
      const text2 = (msgs2[0] as any)?.message || '';

      // Python: if "submit a complaint" in t2.lower()
      if (text2.toLowerCase().includes('submit a complaint') || text2.includes('تقديم شكوى')) {
        // Python: await app.send_message(SPAMBOT, "Yes")
        await client.sendMessage(SPAMBOT, { message: 'Yes' });
        await new Promise((r) => setTimeout(r, 1500));

        // Read response
        const msgs3 = await client.getMessages(SPAMBOT, { limit: 1 });
        const text3 = (msgs3[0] as any)?.message || '';

        // Python: if "Please confirm" in t3 or "never send" in t3.lower()
        if (text3.includes('Please confirm') || text3.toLowerCase().includes('never send') || text3.includes('تأكيد')) {
          // Python: await app.send_message(SPAMBOT, "No, I'll never do any of this!")
          await client.sendMessage(SPAMBOT, { message: "No, I'll never do any of this!" });
          await new Promise((r) => setTimeout(r, 1000));

          // Python: await app.send_message(SPAMBOT, _COMplaint_TEXT)
          await client.sendMessage(SPAMBOT, { message: COMPLAINT_TEXT });
        }
      }

      await client.disconnect();

      // Mark as banned in DB
      const account = await db.telegramAccount.findUnique({ where: { phone }, select: { id: true } });
      if (account) {
        await db.telegramAccount.update({ where: { id: account.id }, data: { status: 'banned' } }).catch(() => {});
      }

      return {
        ok: true,
        isBanned: true,
        banType: 'spam_restricted',
        reason: '🟠 مقيّد سبام — تم إرسال شكوى تلقائياً لـ @SpamBot',
        details: {},
      };
    }

    // Python: log.info("%s: spambot returned unhandled response")
    await client.disconnect();
    return {
      ok: true,
      isBanned: false,
      reason: '✅ سليم — @SpamBot لم يُبلغ عن قيود',
      details: {},
    };
  } catch (e: any) {
    try { await client.disconnect(); } catch {}
    return { ok: false, isBanned: false, reason: 'فشل @SpamBot: ' + (e.message || '').substring(0, 50) };
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
    // Use basic check (getMe only) — like Python check_banned_accounts_live
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

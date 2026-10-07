/**
 * lib/telegram/ban-checker.ts — Check if a Telegram account is banned/limited
 * =========================================================================
 */

import { TelegramClient, Api } from 'telegram';
import { db } from '@/lib/db';
import { makeClient } from '@/lib/telegram/client';

export interface BanCheckResult {
  ok: boolean;
  isBanned: boolean;
  reason?: string;
  limitedUntil?: Date;
}

/**
 * Check if an account is banned by attempting a harmless API call.
 */
export async function checkBan(phone: string): Promise<BanCheckResult> {
  let client: TelegramClient;
  try {
    ({ client } = await makeClient(phone));
  } catch (e: any) {
    return { ok: false, isBanned: false, reason: `Failed to connect: ${e.message}` };
  }

  try {
    // Try to get self info — if banned, this throws a specific error
    try {
      const me = await client.getMe();
      if (me) {
        // Account is fine
        await db.banCheck.create({
          data: {
            accountId: (await db.telegramAccount.findUnique({ where: { phone } }))?.id || '',
            isBanned: false,
          },
        }).catch(() => {});
        await client.disconnect();
        return { ok: true, isBanned: false };
      }
    } catch (e: any) {
      const errStr = e.message || String(e);
      // Common ban-related errors
      if (errStr.includes('USER_DEACTIVATED') || errStr.includes('AUTH_KEY_UNREGISTERED')) {
        return { ok: true, isBanned: true, reason: 'الحساب تم تعطيله من تيليجرام' };
      }
      if (errStr.includes('USER_BANNED_IN_CHANNEL')) {
        return { ok: true, isBanned: true, reason: 'محظور من الكتابة في القنوات' };
      }
      if (errStr.includes('PEER_FLOOD')) {
        return { ok: true, isBanned: true, reason: 'حظر فيض (Flood): تيليجرام حظر الحساب مؤقتاً' };
      }
      if (errStr.includes('FLOOD_WAIT')) {
        const match = errStr.match(/(\d+)/);
        const sec = match ? parseInt(match[1], 10) : 60;
        return {
          ok: true,
          isBanned: false,
          reason: `FloodWait: ${sec} ثانية`,
          limitedUntil: new Date(Date.now() + sec * 1000),
        };
      }
      // If unknown error, mark as not banned (account might still work)
      return { ok: true, isBanned: false, reason: `Unknown status: ${errStr}` };
    }

    await client.disconnect();
    return { ok: true, isBanned: false };
  } catch (e: any) {
    try { await client.disconnect(); } catch {}
    return { ok: false, isBanned: false, reason: e.message };
  }
}

/**
 * Run ban check on all accounts of a user.
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

    // Update account status
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

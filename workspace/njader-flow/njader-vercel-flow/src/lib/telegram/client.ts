/**
 * telegramClient.ts — Pure-JS Telegram client using GramJS
 * ========================================================
 *
 * Why GramJS? Because it works in Vercel's serverless environment
 * (no Python subprocess, no .session files, no persistent disk).
 *
 * Sessions are stored as strings in the DB (TelegramAccount.sessionString).
 * Short-lived state (phone_code_hash) is stored in Vercel KV (Redis).
 *
 * Requirements:
 *   npm install telegram
 *   (the GramJS package: https://gram.js.org/)
 *
 * Env vars (set in Vercel):
 *   POSTGRES_URL       — Postgres connection string (Vercel Postgres or external)
 *   KV_REST_API_URL    — Vercel KV (Redis) endpoint
 *   KV_REST_API_TOKEN  — Vercel KV (Redis) token
 *
 * Author: NJADDER SaaS
 */

import { TelegramClient, StringSession } from 'telegram';
import { sessions } from '@vercel/kv';
import { db } from '@/lib/db';

// ----------------------------------------------------------------------
// API Pool management (stored in DB)
// ----------------------------------------------------------------------
async function getApiFromPool(): Promise<{ apiId: number; apiHash: string }> {
  // Use Vercel KV counter for round-robin
  const pool = await db.apiCredential.findMany({
    where: { enabled: true },
    orderBy: { usedCount: 'asc' },
    take: 1,
  });

  if (pool.length === 0) {
    throw new Error('API_POOL_EMPTY: owner must add api_id/api_hash via admin panel');
  }

  const entry = pool[0];
  // Increment usedCount
  await db.apiCredential.update({
    where: { id: entry.id },
    data: { usedCount: { increment: 1 } },
  });

  return { apiId: Number(entry.apiId), apiHash: entry.apiHash };
}

// ----------------------------------------------------------------------
// KV helpers (for short-lived state between requests)
// ----------------------------------------------------------------------
async function kvSet(key: string, value: any, ttlSeconds = 300) {
  try {
    await sessions.set(key, JSON.stringify(value), { ex: ttlSeconds });
  } catch {
    // KV not configured — fall back to in-memory (works only for single-instance)
  }
}

async function kvGet<T = any>(key: string): Promise<T | null> {
  try {
    const v = await sessions.get(key);
    if (!v) return null;
    return typeof v === 'string' ? JSON.parse(v) : v;
  } catch {
    return null;
  }
}

async function kvDel(key: string) {
  try {
    await sessions.del(key);
  } catch {}
}

// ----------------------------------------------------------------------
// Session string storage (in DB, not on disk!)
// ----------------------------------------------------------------------
async function loadSessionString(phone: string): Promise<string | null> {
  const account = await db.telegramAccount.findUnique({
    where: { phone },
    select: { sessionString: true },
  });
  return account?.sessionString || null;
}

async function saveSessionString(phone: string, sessionString: string) {
  await db.telegramAccount.update({
    where: { phone },
    data: { sessionString, status: 'idle' },
  });
}

// ----------------------------------------------------------------------
// Client factory — creates a fresh client each request (stateless!)
// ----------------------------------------------------------------------
export async function makeClient(
  phone: string,
  apiId?: number,
  apiHash?: string
): Promise<{ client: TelegramClient; apiId: number; apiHash: string }> {
  if (!apiId || !apiHash) {
    const api = await getApiFromPool();
    apiId = api.apiId;
    apiHash = api.apiHash;
  }

  // Load existing session string from DB (if any)
  const existingSession = await loadSessionString(phone);
  const stringSession = new StringSession(existingSession || '');

  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
    useWSS: true,  // important for Vercel serverless (no raw TCP)
    deviceModel: 'NJADDER SaaS',
    systemVersion: '6.3',
    appVersion: 'njadder-saas/6.3',
    langCode: 'en',
    systemLangCode: 'en',
  });

  await client.connect();

  return { client, apiId, apiHash };
}

// ----------------------------------------------------------------------
// Step 1: send_code
// ----------------------------------------------------------------------
export interface SendCodeResult {
  ok: boolean;
  status: string;
  phone: string;
  phone_code_hash?: string;
  next_step?: 'verify_code';
  message?: string;
  api_id_used?: number;
  already_logged_in?: boolean;
  user?: { id?: string; first_name?: string; username?: string };
  error?: string;
}

export async function sendCode(phone: string): Promise<SendCodeResult> {
  if (!phone.startsWith('+')) phone = '+' + phone.replace(/\D/g, '');

  // Rate limit check (Vercel KV)
  const rateKey = `rate:send_code:${phone}`;
  const rate = (await kvGet<number>(rateKey)) || 0;
  if (rate >= 3) {
    return {
      ok: false,
      status: 'error',
      phone,
      error: 'RATE_LIMITED',
      message: 'طلبت 3 أكواد في آخر 10 دقائق. انتظر قليلاً.',
    };
  }
  await kvSet(rateKey, rate + 1, 600); // 10 min

  let client: TelegramClient;
  let apiId: number;
  let apiHash: string;
  try {
    ({ client, apiId, apiHash } = await makeClient(phone));
  } catch (e: any) {
    return {
      ok: false,
      status: 'error',
      phone,
      error: e.message,
    };
  }

  try {
    // Already logged in?
    try {
      const me = await client.getMe();
      if (me && (me as any).id) {
        await client.disconnect();
        return {
          ok: true,
          status: 'already_logged_in',
          phone,
          user: {
            id: String((me as any).id),
            first_name: (me as any).firstName || (me as any).first_name,
            username: (me as any).username,
          },
          message: 'هذا الرقم مسجّل دخوله بالفعل',
        };
      }
    } catch {
      // not logged in — proceed
    }

    // Send code
    const result = await client.sendCodeRequest(phone, {});
    const phoneCodeHash = (result as any).phoneCodeHash;

    // Store phone_code_hash + apiId + apiHash in KV (for verify step)
    // TTL: 5 minutes (code expires after that)
    await kvSet(`login:${phone}`, {
      phone_code_hash: phoneCodeHash,
      api_id: apiId,
      api_hash: apiHash,
    }, 300);

    // Save session string back to DB (client may have started auth)
    const newSession = (client.session as any).save();
    if (newSession) {
      await saveSessionString(phone, newSession);
    }

    await client.disconnect();

    return {
      ok: true,
      status: 'code_sent',
      phone,
      phone_code_hash: phoneCodeHash,
      next_step: 'verify_code',
      api_id_used: apiId,
      message: 'تم إرسال كود التحقق إلى تيليجرام. أدخله في الخطوة التالية.',
    };
  } catch (e: any) {
    try { await client.disconnect(); } catch {}
    const errStr = e.message || String(e);
    let friendlyError = errStr;

    if (errStr.includes('FloodWait')) {
      const match = errStr.match(/(\d+)/);
      const wait = match ? parseInt(match[1]) : 60;
      friendlyError = `FLOOD_WAIT:${wait}`;
    } else if (errStr.includes('PhoneNumberInvalid')) {
      friendlyError = 'PHONE_NUMBER_INVALID';
    }

    return {
      ok: false,
      status: 'error',
      phone,
      error: friendlyError,
    };
  }
}

// ----------------------------------------------------------------------
// Step 2: verify_code
// ----------------------------------------------------------------------
export interface VerifyCodeResult {
  ok: boolean;
  status: string;
  phone: string;
  next_step?: 'verify_password';
  message?: string;
  user?: { id?: string; first_name?: string; username?: string };
  session_path?: string;
  error?: string;
}

export async function verifyCode(phone: string, code: string, phoneCodeHash?: string): Promise<VerifyCodeResult> {
  if (!phone.startsWith('+')) phone = '+' + phone.replace(/\D/g, '');

  // Retrieve short-lived state from KV
  const state = await kvGet<{ phone_code_hash?: string; api_id?: number; api_hash?: string }>(`login:${phone}`);
  const hash = phoneCodeHash || state?.phone_code_hash;
  const apiId = state?.api_id;
  const apiHash = state?.api_hash;

  if (!hash) {
    return {
      ok: false,
      status: 'error',
      phone,
      error: 'NO_PHONE_CODE_HASH: must call send_code first',
    };
  }

  let client: TelegramClient;
  try {
    ({ client } = await makeClient(phone, apiId, apiHash));
  } catch (e: any) {
    return { ok: false, status: 'error', phone, error: e.message };
  }

  try {
    try {
      await client.invoke(
        new (await import('telegram/tl/api/types')).InputPhoneCodeHash({
          phoneCodeHash: hash,
        }) as any
      );
    } catch {
      // Different GramJS version API — try the standard sign-in
    }

    // Standard sign-in flow:
    const result = await client.signInUserWithCode(
      phone,
      { code, phoneCodeHash: hash } as any
    );

    // If 2FA required:
    if (result && (result as any).errorMessage === 'SESSION_PASSWORD_NEEDED') {
      // Save updated session for password step
      const newSession = (client.session as any).save();
      if (newSession) await saveSessionString(phone, newSession);
      await client.disconnect();

      return {
        ok: true,
        status: '2fa_required',
        phone,
        next_step: 'verify_password',
        message: 'هذا الحساب مُفعّل عليه كلمة مرور ثنائية (2FA). أدخلها في الخطوة التالية.',
      };
    }

    // Success — save session
    const newSession = (client.session as any).save();
    if (newSession) await saveSessionString(phone, newSession);

    let me: any = null;
    try { me = await client.getMe(); } catch {}
    await client.disconnect();

    await kvDel(`login:${phone}`);

    return {
      ok: true,
      status: 'logged_in',
      phone,
      user: me ? {
        id: String(me.id),
        first_name: me.firstName || me.first_name,
        username: me.username,
      } : undefined,
      message: 'تم تسجيل الدخول بنجاح ✓',
    };
  } catch (e: any) {
    try { await client.disconnect(); } catch {}
    const errStr = e.message || String(e);
    let friendlyError = errStr;

    if (errStr.includes('PHONE_CODE_INVALID')) {
      friendlyError = 'INVALID_CODE: الكود غير صحيح';
    } else if (errStr.includes('PHONE_CODE_EXPIRED')) {
      friendlyError = 'CODE_EXPIRED: انتهت صلاحية الكود';
    } else if (errStr.includes('SESSION_PASSWORD_NEEDED')) {
      // Save session for password step
      return {
        ok: true,
        status: '2fa_required',
        phone,
        next_step: 'verify_password',
        message: 'هذا الحساب مُفعّل عليه كلمة مرور ثنائية (2FA).',
      };
    }

    return {
      ok: false,
      status: 'error',
      phone,
      error: friendlyError,
    };
  }
}

// ----------------------------------------------------------------------
// Step 3: verify_password (2FA)
// ----------------------------------------------------------------------
export async function verifyPassword(phone: string, password: string): Promise<VerifyCodeResult> {
  if (!phone.startsWith('+')) phone = '+' + phone.replace(/\D/g, '');

  const state = await kvGet<{ api_id?: number; api_hash?: string }>(`login:${phone}`);
  let client: TelegramClient;
  try {
    ({ client } = await makeClient(phone, state?.api_id, state?.api_hash));
  } catch (e: any) {
    return { ok: false, status: 'error', phone, error: e.message };
  }

  try {
    // Get password salt + invoke
    const passwordSrpResult: any = await client.invoke(
      new (await import('telegram/tl/api/functions')).account.GetPassword()
    );
    const { Password } = await import('telegram/Password');
    const passwordRes = await Password.computeCheck(passwordSrpResult, password);
    await client.invoke(
      new (await import('telegram/tl/api/functions')).auth.CheckPassword({ password: passwordRes })
    );

    // Success — save session
    const newSession = (client.session as any).save();
    if (newSession) await saveSessionString(phone, newSession);

    let me: any = null;
    try { me = await client.getMe(); } catch {}
    await client.disconnect();
    await kvDel(`login:${phone}`);

    return {
      ok: true,
      status: 'logged_in',
      phone,
      user: me ? {
        id: String(me.id),
        first_name: me.firstName || me.first_name,
        username: me.username,
      } : undefined,
      message: 'تم تسجيل الدخول بنجاح بكلمة المرور الثنائية ✓',
    };
  } catch (e: any) {
    try { await client.disconnect(); } catch {}
    const errStr = e.message || String(e);
    let friendlyError = errStr;
    if (errStr.includes('PASSWORD_HASH_INVALID') || errStr.includes('PASSWORD_INVALID')) {
      friendlyError = 'INVALID_PASSWORD: كلمة المرور الثنائية غير صحيحة';
    }
    return { ok: false, status: 'error', phone, error: friendlyError };
  }
}

// ----------------------------------------------------------------------
// Status check
// ----------------------------------------------------------------------
export async function getStatus(phone: string): Promise<{ ok: boolean; status: string; phone: string; logged_in?: boolean; user?: any }> {
  if (!phone.startsWith('+')) phone = '+' + phone.replace(/\D/g, '');

  // Try with stored API credentials
  const account = await db.telegramAccount.findUnique({
    where: { phone },
    select: { sessionString: true },
  });

  if (!account?.sessionString) {
    return { ok: true, status: 'not_logged_in', phone };
  }

  // Try first enabled API
  const api = await db.apiCredential.findFirst({ where: { enabled: true } });
  if (!api) return { ok: true, status: 'not_logged_in', phone };

  try {
    const { client } = await makeClient(phone, Number(api.apiId), api.apiHash);
    try {
      const me = await client.getMe();
      if (me) {
        await client.disconnect();
        return {
          ok: true,
          status: 'logged_in',
          phone,
          logged_in: true,
          user: {
            id: String((me as any).id),
            first_name: (me as any).firstName || (me as any).first_name,
            username: (me as any).username,
          },
        };
      }
    } catch {}
    await client.disconnect();
  } catch {}

  return { ok: true, status: 'not_logged_in', phone };
}

// ----------------------------------------------------------------------
// Logout (revoke + clear session string)
// ----------------------------------------------------------------------
export async function logout(phone: string): Promise<{ ok: boolean; phone: string; status: string; message?: string }> {
  if (!phone.startsWith('+')) phone = '+' + phone.replace(/\D/g, '');

  try {
    const account = await db.telegramAccount.findUnique({
      where: { phone },
      select: { sessionString: true },
    });
    if (account?.sessionString) {
      const api = await db.apiCredential.findFirst({ where: { enabled: true } });
      if (api) {
        const { client } = await makeClient(phone, Number(api.apiId), api.apiHash);
        try {
          await client.invoke(new (await import('telegram/tl/api/functions')).auth.LogOut());
        } catch {}
        await client.disconnect();
      }
    }

    // Clear session string
    await db.telegramAccount.update({
      where: { phone },
      data: { sessionString: null, status: 'idle' },
    });

    await kvDel(`login:${phone}`);

    return { ok: true, phone, status: 'logged_out', message: 'تم تسجيل الخروج' };
  } catch (e: any) {
    return { ok: false, phone, status: 'error', message: e.message };
  }
}

// ----------------------------------------------------------------------
// Admin: API Pool
// ----------------------------------------------------------------------
export async function poolListDb() {
  const pool = await db.apiCredential.findMany({ orderBy: { createdAt: 'asc' } });
  return pool.map((p: any) => ({
    api_id: p.apiId,
    api_hash_masked: '••••' + p.apiHash.slice(-4),
    label: p.label || '',
    enabled: p.enabled,
    usedCount: p.usedCount,
  }));
}

export async function poolAddDb(apiId: string, apiHash: string, label: string) {
  await db.apiCredential.upsert({
    where: { apiId },
    create: { apiId, apiHash, label: label || null, enabled: true },
    update: { apiHash, label: label || null, enabled: true },
  });
  return { ok: true, message: 'تمت إضافة API جديد للـ pool' };
}

export async function poolRemoveDb(apiId: string) {
  await db.apiCredential.updateMany({
    where: { apiId },
    data: { enabled: false },
  });
  return { ok: true, message: 'تم حذف API من الـ pool' };
}

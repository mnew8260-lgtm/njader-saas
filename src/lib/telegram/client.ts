/**
 * telegramClient.ts — Pure-JS Telegram client using GramJS
 * ========================================================
 *
 * Why GramJS? Because it works in Vercel's serverless environment
 * (no Python subprocess, no .session files, no persistent disk).
 *
 * Sessions are stored as strings in the DB (TelegramAccount.sessionString).
 * Short-lived state (phone_code_hash) is stored in local KV store
 * (replaceable with @vercel/kv for production multi-instance).
 *
 * Requirements:
 *   npm install telegram
 *
 * Env vars:
 *   DATABASE_URL  — Postgres/SQLite connection string
 *   (for production): KV_REST_API_URL, KV_REST_API_TOKEN — Vercel KV
 */

import { TelegramClient, sessions as Sessions, Api } from 'telegram';
import { sessions, kvSet, kvGet, kvDel } from '@/lib/kv-store';
import { db } from '@/lib/db';

const { StringSession } = Sessions;

// ----------------------------------------------------------------------
// API Pool management (stored in DB)
// ----------------------------------------------------------------------
async function getApiFromPool(): Promise<{ apiId: number; apiHash: string }> {
  const pool = await db.apiCredential.findMany({
    where: { enabled: true },
    orderBy: { usedCount: 'asc' },
    take: 1,
  });

  if (pool.length === 0) {
    throw new Error('API_POOL_EMPTY: owner must add api_id/api_hash via admin panel');
  }

  const entry = pool[0];
  await db.apiCredential.update({
    where: { id: entry.id },
    data: { usedCount: { increment: 1 } },
  });

  return { apiId: Number(entry.apiId), apiHash: entry.apiHash };
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
  // upsert so we don't fail if the account doesn't exist yet
  await db.telegramAccount.upsert({
    where: { phone },
    create: {
      phone,
      apiId: '***',
      apiHash: '***',
      sessionString,
      status: 'idle',
    },
    update: { sessionString },
  });
}

// ----------------------------------------------------------------------
// Proxy auto-selection (HYBRID mode)
// Strategy:
//   1. If account has customProxyId → use that
//   2. Else if account has ProxyAssignment → use that
//   3. Else auto-assign: pick least-used working proxy from developer's pool
//   4. If no proxies available → connect directly (no proxy)
// ----------------------------------------------------------------------
async function getProxyForAccount(phone: string): Promise<{
  type: 'socks5' | 'http' | 'https';
  host: string;
  port: number;
  username?: string;
  password?: string;
} | null> {
  // Load account with all proxy relations
  const account = await db.telegramAccount.findUnique({
    where: { phone },
    select: {
      id: true,
      customProxyId: true,
      customProxy: true,
      proxyAssignments: { include: { proxy: true }, take: 1 },
    },
  });

  if (!account) return null;

  // 1) Custom user-set proxy (highest priority)
  if (account.customProxy && account.customProxy.enabled && account.customProxy.isWorking) {
    return {
      type: account.customProxy.type as any,
      host: account.customProxy.host,
      port: account.customProxy.port,
      username: account.customProxy.username || undefined,
      password: account.customProxy.password || undefined,
    };
  }

  // 2) Auto-assigned proxy from developer's pool
  if (account.proxyAssignments[0]?.proxy) {
    const p = account.proxyAssignments[0].proxy;
    if (p.enabled && p.isWorking) {
      return {
        type: p.type as any,
        host: p.host,
        port: p.port,
        username: p.username || undefined,
        password: p.password || undefined,
      };
    }
  }

  // 3) Auto-assign: pick least-used working proxy
  const proxy = await db.proxy.findFirst({
    where: { enabled: true, isWorking: true },
    orderBy: { usedCount: 'asc' },
  });

  if (!proxy) return null;

  // Sticky assignment for consistency
  await db.proxyAssignment.upsert({
    where: { accountId: account.id },
    create: { proxyId: proxy.id, accountId: account.id },
    update: { proxyId: proxy.id },
  }).catch(() => {});

  await db.proxy.update({
    where: { id: proxy.id },
    data: { usedCount: { increment: 1 } },
  }).catch(() => {});

  return {
    type: proxy.type as any,
    host: proxy.host,
    port: proxy.port,
    username: proxy.username || undefined,
    password: proxy.password || undefined,
  };
}

/**
 * Build GramJS-compatible proxy option
 */
function buildProxyOption(proxy: {
  type: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
}): any {
  // GramJS uses IP/port format for SOCKS5
  if (proxy.type === 'socks5') {
    return {
      socksType: 5,
      ip: proxy.host,
      port: proxy.port,
      ...(proxy.username ? { username: proxy.username, password: proxy.password || '' } : {}),
    };
  }
  // For HTTP/HTTPS, GramJS uses an agent
  return {
    socksType: 5,
    ip: proxy.host,
    port: proxy.port,
    ...(proxy.username ? { username: proxy.username, password: proxy.password || '' } : {}),
  };
}

// ----------------------------------------------------------------------
// Client factory — creates a fresh client each request (stateless!)
// Auto-uses proxy (custom or auto-assigned) + API from pool
// ----------------------------------------------------------------------
export async function makeClient(
  phone: string,
  apiId?: number,
  apiHash?: string
): Promise<{ client: TelegramClient; apiId: number; apiHash: string; proxyUsed?: string }> {
  if (!apiId || !apiHash) {
    const api = await getApiFromPool();
    apiId = api.apiId;
    apiHash = api.apiHash;
  }

  const existingSession = await loadSessionString(phone);
  const stringSession = new StringSession(existingSession || '');

  // Get proxy (custom > auto-assigned > none)
  const proxy = await getProxyForAccount(phone);

  const clientOptions: any = {
    connectionRetries: 5,
    useWSS: !proxy, // use WSS only if no proxy (proxy doesn't support WSS)
    deviceModel: 'njadder',
    systemVersion: '6.3',
    appVersion: 'njadder-saas/6.3',
    langCode: 'en',
    systemLangCode: 'en',
  };

  // Add proxy if available
  if (proxy) {
    clientOptions.proxy = buildProxyOption(proxy);
  }

  const client = new TelegramClient(stringSession, apiId, apiHash, clientOptions);

  await client.connect();
  return {
    client,
    apiId,
    apiHash,
    proxyUsed: proxy ? `${proxy.type}://${proxy.host}:${proxy.port}` : undefined,
  };
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

  // Rate limit check (3 attempts per 10 min per phone)
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
  await kvSet(rateKey, rate + 1, 600);

  let client: TelegramClient;
  let apiId: number;
  let apiHash: string;
  try {
    ({ client, apiId, apiHash } = await makeClient(phone));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, status: 'error', phone, error: msg };
  }

  try {
    // Already logged in?
    try {
      const me = (await client.getMe()) as Record<string, unknown> | null;
      if (me && me.id) {
        await client.disconnect();
        return {
          ok: true,
          status: 'already_logged_in',
          phone,
          user: {
            id: String(me.id),
            first_name: (me.firstName as string) || (me.first_name as string),
            username: me.username as string,
          },
          message: 'هذا الرقم مسجّل دخوله بالفعل',
        };
      }
    } catch {
      // not logged in — proceed
    }

    // Send code (GramJS 2.x: sendCode(apiCredentials, phoneNumber))
    const result = await client.sendCode({ apiId, apiHash }, phone);
    const phoneCodeHash = (result as { phoneCodeHash?: string }).phoneCodeHash || '';

    // Persist short-lived state in KV (apiId/apiHash must match in step 2)
    await kvSet(`login:${phone}`, {
      phone_code_hash: phoneCodeHash,
      api_id: apiId,
      api_hash: apiHash,
    }, 300);

    // Persist the partial session string (GramJS may have started a new auth)
    const newSession = (client.session as unknown as { save?: () => string }).save?.();
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
  } catch (e: unknown) {
    try { await client.disconnect(); } catch {}
    const errStr = e instanceof Error ? e.message : String(e);
    let friendlyError = errStr;

    if (errStr.includes('FloodWait')) {
      const match = errStr.match(/(\d+)/);
      const wait = match ? parseInt(match[1], 10) : 60;
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
  error?: string;
}

export async function verifyCode(phone: string, code: string, phoneCodeHash?: string): Promise<VerifyCodeResult> {
  if (!phone.startsWith('+')) phone = '+' + phone.replace(/\D/g, '');

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
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, status: 'error', phone, error: msg };
  }

  try {
    // Standard GramJS sign-in flow:
    const result = await client.invoke(
      new Api.auth.SignIn({ phoneNumber: phone, phoneCodeHash: hash, phoneCode: code })
    );

    // If 2FA required:
    if (result instanceof Api.auth.AuthorizationSignUpRequired) {
      await client.disconnect();
      return {
        ok: false,
        status: 'error',
        phone,
        error: 'SIGNUP_REQUIRED: هذا الرقم غير مسجل في تيليجرام',
      };
    }

    // Save session string after successful sign-in
    const newSession = (client.session as unknown as { save?: () => string }).save?.();
    if (newSession) await saveSessionString(phone, newSession);

    let me: Record<string, unknown> | null = null;
    try { me = await client.getMe() as Record<string, unknown>; } catch {}
    await client.disconnect();
    await kvDel(`login:${phone}`);

    return {
      ok: true,
      status: 'logged_in',
      phone,
      user: me ? {
        id: String(me.id),
        first_name: (me.firstName as string) || (me.first_name as string),
        username: me.username as string,
      } : undefined,
      message: 'تم تسجيل الدخول بنجاح ✓',
    };
  } catch (e: unknown) {
    try { await client.disconnect(); } catch {}
    const errStr = e instanceof Error ? e.message : String(e);
    let friendlyError = errStr;

    if (errStr.includes('PHONE_CODE_INVALID')) {
      friendlyError = 'INVALID_CODE: الكود غير صحيح';
    } else if (errStr.includes('PHONE_CODE_EXPIRED')) {
      friendlyError = 'CODE_EXPIRED: انتهت صلاحية الكود';
    } else if (errStr.includes('SESSION_PASSWORD_NEEDED')) {
      // Save session for password step
      const newSession = (client.session as unknown as { save?: () => string }).save?.();
      if (newSession) await saveSessionString(phone, newSession);
      try { await client.disconnect(); } catch {}

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
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, status: 'error', phone, error: msg };
  }

  try {
    // Get password salt + invoke
    const passwordSrpResult = await client.invoke(new Api.account.GetPassword());

    // GramJS 2.x: the password helper is `password.computeCheck` (lowercase),
    // not `Password.computeCheck` as in older versions.
    const { password: PasswordHelper } = await import('telegram');
    if (!PasswordHelper || typeof (PasswordHelper as any).computeCheck !== 'function') {
      throw new Error('PASSWORD_HELPER_UNAVAILABLE: GramJS password helper not found');
    }
    const passwordRes = await (PasswordHelper as any).computeCheck(passwordSrpResult as any, password);
    await client.invoke(new Api.auth.CheckPassword({ password: passwordRes as any }));

    const newSession = (client.session as unknown as { save?: () => string }).save?.();
    if (newSession) await saveSessionString(phone, newSession);

    let me: Record<string, unknown> | null = null;
    try { me = await client.getMe() as Record<string, unknown>; } catch {}
    await client.disconnect();
    await kvDel(`login:${phone}`);

    return {
      ok: true,
      status: 'logged_in',
      phone,
      user: me ? {
        id: String(me.id),
        first_name: (me.firstName as string) || (me.first_name as string),
        username: me.username as string,
      } : undefined,
      message: 'تم تسجيل الدخول بنجاح بكلمة المرور الثنائية ✓',
    };
  } catch (e: unknown) {
    try { await client.disconnect(); } catch {}
    const errStr = e instanceof Error ? e.message : String(e);
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
export async function getStatus(phone: string): Promise<{ ok: boolean; status: string; phone: string; logged_in?: boolean; user?: { id?: string; first_name?: string; username?: string } }> {
  if (!phone.startsWith('+')) phone = '+' + phone.replace(/\D/g, '');

  const account = await db.telegramAccount.findUnique({
    where: { phone },
    select: { sessionString: true },
  });

  if (!account?.sessionString) {
    return { ok: true, status: 'not_logged_in', phone };
  }

  const api = await db.apiCredential.findFirst({ where: { enabled: true } });
  if (!api) return { ok: true, status: 'not_logged_in', phone };

  try {
    const { client } = await makeClient(phone, Number(api.apiId), api.apiHash);
    try {
      const me = (await client.getMe()) as Record<string, unknown> | null;
      if (me) {
        await client.disconnect();
        return {
          ok: true,
          status: 'logged_in',
          phone,
          logged_in: true,
          user: {
            id: String(me.id),
            first_name: (me.firstName as string) || (me.first_name as string),
            username: me.username as string,
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
          await client.invoke(new Api.auth.LogOut());
        } catch {}
        await client.disconnect();
      }
    }

    await db.telegramAccount.update({
      where: { phone },
      data: { sessionString: null, status: 'idle' },
    }).catch(() => {});

    await kvDel(`login:${phone}`);

    return { ok: true, phone, status: 'logged_out', message: 'تم تسجيل الخروج' };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, phone, status: 'error', message: msg };
  }
}

// ----------------------------------------------------------------------
// Admin: API Pool
// ----------------------------------------------------------------------
export async function poolListDb() {
  const pool = await db.apiCredential.findMany({ orderBy: { createdAt: 'asc' } });
  return pool.map((p) => ({
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

// Re-export sessions for backward compat
export { sessions };

/**
 * lib/kv-store.ts — In-memory KV store with TTL
 * ==============================================
 *
 * Drop-in replacement for @vercel/kv's `sessions` namespace for local dev.
 * - Works for single-instance Node.js servers (Next.js dev / Vercel Hobby single-instance)
 * - On Vercel Pro/Enterprise with multiple instances: replace with real @vercel/kv
 *
 * Public API (matches @vercel/kv):
 *   sessions.set(key, value, { ex: ttlSeconds })
 *   sessions.get(key)
 *   sessions.del(key)
 */

interface KvEntry {
  value: string;
  expiresAt: number; // epoch ms, 0 = never expires
}

const store = new Map<string, KvEntry>();

// Periodic cleanup (every 60s)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of store) {
      if (v.expiresAt > 0 && v.expiresAt < now) {
        store.delete(k);
      }
    }
  }, 60_000).unref?.();
}

export const sessions = {
  async set(key: string, value: string, opts?: { ex?: number }): Promise<'OK'> {
    const ttl = opts?.ex ?? 0;
    store.set(key, {
      value,
      expiresAt: ttl > 0 ? Date.now() + ttl * 1000 : 0,
    });
    return 'OK';
  },

  async get(key: string): Promise<string | null> {
    const entry = store.get(key);
    if (!entry) return null;
    if (entry.expiresAt > 0 && entry.expiresAt < Date.now()) {
      store.delete(key);
      return null;
    }
    return entry.value;
  },

  async del(key: string): Promise<number> {
    return store.delete(key) ? 1 : 0;
  },
};

/**
 * Helper for typed JSON usage (mirrors kvGet/kvSet in telegram/client.ts).
 */
export async function kvSet(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  await sessions.set(key, JSON.stringify(value), { ex: ttlSeconds });
}

export async function kvGet<T = unknown>(key: string): Promise<T | null> {
  const v = await sessions.get(key);
  if (!v) return null;
  try {
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
}

export async function kvDel(key: string): Promise<void> {
  await sessions.del(key);
}

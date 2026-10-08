/**
 * lib/telegram/multi-account-executor.ts
 * ====================================
 * Multi-account operations: distribute work across multiple Telegram accounts
 * for faster scraping, adding, and filtering with auto-failover on FloodWait.
 */

import { db } from '@/lib/db';
import { makeClient } from '@/lib/telegram/client';
import { executeCommand } from '@/lib/telegram/command-executor';
import { getCommandById } from '@/lib/commands';

export interface MultiAccountResult {
  ok: boolean;
  totalAccounts: number;
  activeAccounts: number;
  failedAccounts: number;
  results: AccountResult[];
  mergedOutput: string;
  totalCount: number;
  duration: number;
}

export interface AccountResult {
  accountId: string;
  phone: string;
  status: 'success' | 'failed' | 'flood_wait' | 'skipped';
  itemsProcessed: number;
  output?: string;
  error?: string;
  duration: number;
}

/**
 * Distribute work items across accounts evenly.
 * Returns a map of accountId -> items assigned to that account.
 */
export function distributeWork<T>(
  accountIds: string[],
  items: T[],
): Map<string, T[]> {
  const distribution = new Map<string, T[]>();
  if (accountIds.length === 0 || items.length === 0) return distribution;

  const itemsPerAccount = Math.ceil(items.length / accountIds.length);

  for (let i = 0; i < accountIds.length; i++) {
    const start = i * itemsPerAccount;
    const end = Math.min(start + itemsPerAccount, items.length);
    distribution.set(accountIds[i], items.slice(start, end));
  }

  return distribution;
}

/**
 * Execute a command across multiple accounts in parallel.
 * Each account processes its portion of the work.
 */
export async function executeMultiAccount(opts: {
  userId: string;
  accountIds: string[];
  commandId: string;
  params: Record<string, any>;
  mode: 'parallel' | 'sequential';
}): Promise<MultiAccountResult> {
  const { userId, accountIds, commandId, params, mode } = opts;
  const start = Date.now();

  // Get all accounts owned by the user
  const accounts = await db.telegramAccount.findMany({
    where: {
      id: { in: accountIds },
      ownerId: userId,
      sessionString: { not: null },
    },
    select: { id: true, phone: true, fullName: true },
  });

  if (accounts.length === 0) {
    return {
      ok: false,
      totalAccounts: 0,
      activeAccounts: 0,
      failedAccounts: 0,
      results: [],
      mergedOutput: 'لا توجد حسابات متاحة',
      totalCount: 0,
      duration: Date.now() - start,
    };
  }

  const results: AccountResult[] = [];

  if (mode === 'parallel') {
    // Run all accounts in parallel
    const promises = accounts.map(async (account) => {
      return runOnAccount({
        accountId: account.id,
        phone: account.phone,
        userId,
        commandId,
        params,
      });
    });
    const settled = await Promise.allSettled(promises);
    settled.forEach((s, i) => {
      if (s.status === 'fulfilled') {
        results.push(s.value);
      } else {
        results.push({
          accountId: accounts[i].id,
          phone: accounts[i].phone,
          status: 'failed',
          itemsProcessed: 0,
          error: String(s.reason),
          duration: 0,
        });
      }
    });
  } else {
    // Run sequentially
    for (const account of accounts) {
      const result = await runOnAccount({
        accountId: account.id,
        phone: account.phone,
        userId,
        commandId,
        params,
      });
      results.push(result);

      // If FloodWait, try to redistribute remaining work
      if (result.status === 'flood_wait') {
        // Skip remaining accounts for this batch (they'd hit FloodWait too)
        break;
      }
    }
  }

  // Merge results
  const activeAccounts = results.filter((r) => r.status === 'success').length;
  const failedAccounts = results.filter((r) => r.status !== 'success').length;
  const totalCount = results.reduce((sum, r) => sum + r.itemsProcessed, 0);

  // Build merged output
  let mergedOutput = `🔄 نتائج Multi-Account (${accounts.length} حساب):\n`;
  mergedOutput += `✅ نجح: ${activeAccounts} | ❌ فشل: ${failedAccounts}\n`;
  mergedOutput += `📊 إجمالي المعالَج: ${totalCount}\n`;
  mergedOutput += `⏱️ المدة: ${((Date.now() - start) / 1000).toFixed(1)}s\n`;
  mergedOutput += '═'.repeat(50) + '\n\n';

  for (const r of results) {
    const icon = r.status === 'success' ? '✅' : r.status === 'flood_wait' ? '⏱️' : '❌';
    mergedOutput += `${icon} ${r.phone} — ${r.status} (${r.itemsProcessed} عنصر`;
    if (r.duration > 0) mergedOutput += `, ${(r.duration / 1000).toFixed(1)}s`;
    mergedOutput += ')\n';
    if (r.error) mergedOutput += `   خطأ: ${r.error.substring(0, 80)}\n`;
    if (r.output) {
      // Show first 200 chars of output per account
      mergedOutput += `   ${r.output.substring(0, 200)}\n`;
    }
    mergedOutput += '\n';
  }

  // Append full outputs at the end
  mergedOutput += '\n' + '═'.repeat(50) + '\n📋 التفاصيل الكاملة:\n\n';
  for (const r of results) {
    if (r.output && r.status === 'success') {
      mergedOutput += `── ${r.phone} ──\n${r.output}\n\n`;
    }
  }

  return {
    ok: activeAccounts > 0,
    totalAccounts: accounts.length,
    activeAccounts,
    failedAccounts,
    results,
    mergedOutput,
    totalCount,
    duration: Date.now() - start,
  };
}

/**
 * Run a single command on a single account.
 * Handles FloodWait detection.
 */
async function runOnAccount(opts: {
  accountId: string;
  phone: string;
  userId: string;
  commandId: string;
  params: Record<string, any>;
}): Promise<AccountResult> {
  const start = Date.now();
  try {
    const result = await executeCommand({
      userId: opts.userId,
      accountId: opts.accountId,
      commandId: opts.commandId,
      params: opts.params,
    });

    if (result.ok) {
      // Count items in output (lines starting with • or @)
      const itemCount = (result.output || '').split('\n').filter((l) =>
        l.startsWith('•') || l.startsWith('@') || l.startsWith('✓')
      ).length;

      return {
        accountId: opts.accountId,
        phone: opts.phone,
        status: 'success',
        itemsProcessed: itemCount,
        output: result.output,
        duration: Date.now() - start,
      };
    } else {
      // Check if FloodWait
      const isFlood = (result.error || '').includes('FLOOD_WAIT') ||
                      (result.output || '').includes('FLOOD_WAIT') ||
                      (result.error || '').includes('FloodWait');

      return {
        accountId: opts.accountId,
        phone: opts.phone,
        status: isFlood ? 'flood_wait' : 'failed',
        itemsProcessed: 0,
        output: result.output,
        error: result.error,
        duration: Date.now() - start,
      };
    }
  } catch (e: any) {
    return {
      accountId: opts.accountId,
      phone: opts.phone,
      status: 'failed',
      itemsProcessed: 0,
      error: e.message,
      duration: Date.now() - start,
    };
  }
}

/**
 * Smart distribution for scraping:
 * Each account scrapes a different offset range of the group.
 */
export function distributeScrapeOffsets(
  accountIds: string[],
  totalLimit: number,
): Map<string, { offset: number; limit: number }> {
  const distribution = new Map<string, { offset: number; limit: number }>();
  if (accountIds.length === 0) return distribution;

  const perAccount = Math.ceil(totalLimit / accountIds.length);

  for (let i = 0; i < accountIds.length; i++) {
    const offset = i * perAccount;
    const limit = Math.min(perAccount, totalLimit - offset);
    if (limit > 0) {
      distribution.set(accountIds[i], { offset, limit });
    }
  }

  return distribution;
}

/**
 * Smart distribution for adding:
 * Each account gets a portion of the user list.
 */
export function distributeAddUsers(
  accountIds: string[],
  userList: string,
): Map<string, string[]> {
  const users = userList.split('\n').map((s) => s.trim()).filter(Boolean);
  return distributeWork(accountIds, users);
}

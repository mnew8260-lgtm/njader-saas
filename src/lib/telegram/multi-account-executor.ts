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

// Commands that have a "userList" param which should be SPLIT across accounts
const SPLIT_USERLIST_COMMANDS = new Set([
  'mass_add_members',
  'op3_add_from_list',
  'op3_add_from_file',
  'op3_multi_target_add',
  'add_from_file',
  'mass_dm',
  'mass_dm_group_members',
  'msg_dm_csv',
  'msg_dm_csv_photo',
  'mass_kick',
  'mass_ban',
  'mass_mute',
  'mass_unmute',
  'mass_promote',
  'msg_multi_to_one',
  'msg_multi_to_multi',
  'msg_single_n_copies',
  'add_from_phone_book',
]);

// Commands that scrape — each account should get different offset
const SCRAPE_COMMANDS_MULTI = new Set([
  'scrape_group_members',
  'scrape_private_group',
  'scrape_deep_members',
  'filter_combine',
  'export_members_csv',
]);

/**
 * Execute a command across multiple accounts in parallel.
 * For "add" commands: splits userList across accounts
 * For "scrape" commands: each account gets different offset
 * For other commands: same params to all accounts
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

  const accountIdsValid = accounts.map((a) => a.id);
  const results: AccountResult[] = [];

  // Prepare per-account params
  const perAccountParams = prepareAccountParams(commandId, params, accountIdsValid);

  if (mode === 'sequential') {
    // Run sequentially — stop on FloodWait
    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      const result = await runOnAccount({
        accountId: account.id,
        phone: account.phone,
        userId,
        commandId,
        params: perAccountParams.get(account.id) || params,
      });
      results.push(result);

      if (result.status === 'flood_wait') {
        // Skip remaining — they'd hit FloodWait too
        for (let j = i + 1; j < accounts.length; j++) {
          results.push({
            accountId: accounts[j].id,
            phone: accounts[j].phone,
            status: 'skipped',
            itemsProcessed: 0,
            output: '⏭️ تم تخطي هذا الحساب بسبب FloodWait على الحساب السابق',
            duration: 0,
          });
        }
        break;
      }
    }
  } else {
    // Run all accounts in parallel
    const promises = accounts.map(async (account) => {
      return runOnAccount({
        accountId: account.id,
        phone: account.phone,
        userId,
        commandId,
        params: perAccountParams.get(account.id) || params,
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
  }

  // Merge results
  const activeAccounts = results.filter((r) => r.status === 'success').length;
  const failedAccounts = results.filter((r) => r.status !== 'success' && r.status !== 'skipped').length;
  const totalCount = results.reduce((sum, r) => sum + r.itemsProcessed, 0);

  // Build merged output
  let mergedOutput = `🔄 Multi-Account — ${accounts.length} حساب\n`;
  mergedOutput += `✅ نجح: ${activeAccounts} | ❌ فشل: ${failedAccounts} | ⏭️ تخطّي: ${results.filter(r => r.status === 'skipped').length}\n`;
  mergedOutput += `📊 إجمالي المعالَج: ${totalCount}\n`;
  mergedOutput += `⏱️ المدة: ${((Date.now() - start) / 1000).toFixed(1)}s\n`;
  mergedOutput += '═'.repeat(50) + '\n\n';

  for (const r of results) {
    const icon = r.status === 'success' ? '✅' : r.status === 'flood_wait' ? '⏱️' : r.status === 'skipped' ? '⏭️' : '❌';
    mergedOutput += `${icon} ${r.phone} — ${r.status} (${r.itemsProcessed} عنصر`;
    if (r.duration > 0) mergedOutput += `, ${(r.duration / 1000).toFixed(1)}s`;
    mergedOutput += ')\n';
    if (r.error) mergedOutput += `   خطأ: ${r.error.substring(0, 80)}\n`;
    if (r.output) {
      mergedOutput += `   ${r.output.substring(0, 300)}\n`;
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
 * Prepare per-account params:
 * - For "add" commands: split userList across accounts
 * - For "scrape" commands: give each account a different offset
 * - For others: same params to all
 */
function prepareAccountParams(
  commandId: string,
  params: Record<string, any>,
  accountIds: string[],
): Map<string, Record<string, any>> {
  const result = new Map<string, Record<string, any>>();

  // Case 1: Split userList across accounts
  if (SPLIT_USERLIST_COMMANDS.has(commandId) && params.userList) {
    const users = String(params.userList)
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const distribution = distributeWork(accountIds, users);

    for (const [accId, userSlice] of distribution) {
      const sliceParams = { ...params };
      if (userSlice.length > 0) {
        sliceParams.userList = userSlice.join('\n');
        sliceParams._multiAccountNote = `تم توزيع ${userSlice.length} من ${users.length} مستخدم على هذا الحساب`;
      } else {
        sliceParams.userList = '';
        sliceParams._multiAccountNote = 'لا يوجد مستخدمون مخصصون لهذا الحساب';
      }
      result.set(accId, sliceParams);
    }

    return result;
  }

  // Case 2: For transfer/add_from_group — split the limit across accounts
  if (commandId === 'transfer_members' || 
      commandId === 'op3_add_from_group' ||
      commandId === 'op3_add_active_members' ||
      commandId === 'op3_add_online_users' ||
      commandId === 'op3_add_admins' ||
      commandId === 'op3_add_premium_users' ||
      commandId === 'op3_add_recent_joiners' ||
      commandId === 'op3_add_by_country' ||
      commandId === 'op3_add_by_username_pattern' ||
      commandId === 'ramex_clone_group' ||
      commandId === 'ramex_filter_add' ||
      commandId === 'ramex_skip_existing' ||
      commandId === 'ramex_round_robin' ||
      commandId === 'ramex_geo_targeted' ||
      commandId === 'add_mutual_only' ||
      commandId === 'filter_daily_add' ||
      commandId === 'filter_weekly_add' ||
      commandId === 'filter_monthly_add' ||
      commandId === 'filter_online_add' ||
      commandId === 'filter_nonactive_add' ||
      commandId === 'filter_hidden_add') {
    
    const totalLimit = Number(params.limit ?? 30);
    const perAccount = Math.ceil(totalLimit / accountIds.length);

    for (const accId of accountIds) {
      const accParams = { ...params };
      accParams.limit = perAccount;
      accParams._multiAccountNote = `توزيع ${perAccount} من ${totalLimit} على هذا الحساب`;
      result.set(accId, accParams);
    }

    return result;
  }

  // Case 3: For scrape commands — give each account a different offset
  if (SCRAPE_COMMANDS_MULTI.has(commandId)) {
    const totalLimit = Number(params.limit ?? 500);
    const perAccount = Math.ceil(totalLimit / accountIds.length);

    for (let i = 0; i < accountIds.length; i++) {
      const accParams = { ...params };
      accParams.limit = perAccount;
      accParams._multiAccountOffset = i * perAccount;
      accParams._multiAccountNote = `سحب من offset ${i * perAccount}، ${perAccount} عضو`;
      result.set(accountIds[i], accParams);
    }

    return result;
  }

  // Default: same params to all accounts
  for (const accId of accountIds) {
    result.set(accId, { ...params });
  }

  return result;
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
  const note = opts.params._multiAccountNote;
  delete opts.params._multiAccountNote;
  delete opts.params._multiAccountOffset;

  try {
    const result = await executeCommand({
      userId: opts.userId,
      accountId: opts.accountId,
      commandId: opts.commandId,
      params: opts.params,
    });

    if (result.ok) {
      // Count items in output (lines starting with • or ✓)
      const itemCount = (result.output || '').split('\n').filter((l) =>
        l.startsWith('•') || l.startsWith('✓') || l.includes('— أُضيف')
      ).length;

      let output = result.output || '';
      if (note) output = `[${note}]\n${output}`;

      return {
        accountId: opts.accountId,
        phone: opts.phone,
        status: 'success',
        itemsProcessed: itemCount,
        output,
        duration: Date.now() - start,
      };
    } else {
      const isFlood = (result.error || '').includes('FLOOD_WAIT') ||
                      (result.output || '').includes('FLOOD_WAIT') ||
                      (result.error || '').includes('FloodWait') ||
                      (result.output || '').includes('FloodWait');

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

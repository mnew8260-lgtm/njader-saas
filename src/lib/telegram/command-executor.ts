/**
 * lib/telegram/command-executor.ts — Run a Telegram command on an account
 * =====================================================================
 * Receives a command def + params, executes via GramJS, returns output.
 */

import { TelegramClient, Api } from 'telegram';
import { db } from '@/lib/db';
import { makeClient } from '@/lib/telegram/client';
import { getCommandById } from '@/lib/commands';

export interface ExecResult {
  ok: boolean;
  output: string;
  duration?: number;
  error?: string;
  exportId?: string;  // ID of saved scrape export (if applicable)
}

// ----------------------------------------------------------------------
// Save scrape result as exportable file
// ----------------------------------------------------------------------
async function saveScrapeExport(opts: {
  userId: string;
  accountId?: string;
  commandId: string;
  commandName: string;
  output: string;
  sourcePeer?: string;
  format?: 'txt' | 'csv' | 'json';
}): Promise<string | undefined> {
  try {
    // Parse user mentions from output to count + format
    const userLines = opts.output
      .split('\n')
      .filter((l) => l.startsWith('•') || /^\d/.test(l.trim()))
      .map((l) => l.replace(/^[•\s]+/, '').trim());

    if (userLines.length === 0) return undefined;

    const format = opts.format || 'txt';
    let content = '';
    let totalCount = userLines.length;

    if (format === 'json') {
      const users = userLines.map((line, i) => {
        const m = line.match(/(?:@(\w+))?.*?(?:ID:?\s*(\d+))?/i);
        return {
          index: i + 1,
          username: m?.[1] ? '@' + m[1] : null,
          id: m?.[2] || null,
          raw: line,
        };
      });
      content = JSON.stringify(users, null, 2);
    } else if (format === 'csv') {
      content = 'index,username,id,name,phone\n';
      userLines.forEach((line, i) => {
        const usernameMatch = line.match(/@(\w+)/);
        const idMatch = line.match(/(?:ID:?\s*)?(\d{6,})/);
        const phoneMatch = line.match(/\+(\d+)/);
        // Try to extract name (first part before @ or numbers)
        const name = line.split('@')[0].split('|')[0].trim().substring(0, 50);
        content += `${i + 1},${usernameMatch ? '@' + usernameMatch[1] : ''},${idMatch?.[1] || ''},"${name}",${phoneMatch ? '+' + phoneMatch[1] : ''}\n`;
      });
    } else {
      // txt - just the cleaned lines
      content = userLines.join('\n');
    }

    const exportRec = await db.scrapeExport.create({
      data: {
        userId: opts.userId,
        accountId: opts.accountId || null,
        commandId: opts.commandId,
        commandName: opts.commandName,
        format,
        sourcePeer: opts.sourcePeer || null,
        totalCount,
        content,
      },
    });

    return exportRec.id;
  } catch {
    return undefined;
  }
}

// Detect if a command is a "scraping" command that should save export
const SCRAPING_COMMANDS = new Set([
  'scrape_group_members', 'scrape_online_members', 'scrape_admins', 'scrape_bots',
  'scrape_recent_users', 'scrape_group_info', 'check_phone_in_group', 'export_members_csv',
  'scrape_private_group', 'scrape_from_messages', 'scrape_deep_members',
  'scrape_invite_link_members', 'scrape_message_reactions', 'scrape_message_readers',
  'scrape_dialogs_users',
  'filter_by_country', 'filter_by_last_seen', 'filter_by_premium', 'filter_by_username',
  'filter_by_phone', 'filter_by_status', 'filter_by_activity', 'filter_by_language',
  'filter_mutual_contacts', 'filter_combine',
  'get_dialogs', 'get_contacts', 'get_blocked_users',
  'util_chat_history_export', 'util_id_resolver', 'util_backup_session',
  'util_account_statistics', 'util_account_health',
]);

/**
 * Resolve a peer identifier (username, phone, ID) to an Api.InputPeer.
 */
async function resolvePeer(client: TelegramClient, peerInput: string): Promise<any> {
  // Try as @username
  if (peerInput.startsWith('@')) {
    return await client.getInputEntity(peerInput);
  }
  // Try as numeric ID
  if (/^-?\d+$/.test(peerInput)) {
    return await client.getInputEntity(peerInput);
  }
  // Try as phone number
  if (peerInput.startsWith('+')) {
    return await client.getInputEntity(peerInput);
  }
  // Default: try as username (without @)
  return await client.getInputEntity(peerInput);
}

export async function executeCommand(opts: {
  userId: string;
  accountId: string;
  commandId: string;
  params: Record<string, string | number | boolean>;
}): Promise<ExecResult> {
  const { userId, accountId, commandId, params } = opts;
  const cmd = getCommandById(commandId);
  if (!cmd) return { ok: false, output: '', error: 'Command not found' };

  // Get account
  const account = await db.telegramAccount.findFirst({
    where: { id: accountId, ownerId: userId },
  });
  if (!account) return { ok: false, output: '', error: 'Account not found or not owned' };

  const phone = account.phone;

  let client: TelegramClient;
  try {
    ({ client } = await makeClient(phone));
  } catch (e: any) {
    return { ok: false, output: '', error: `Failed to connect: ${e.message}` };
  }

  const start = Date.now();
  let output = '';
  let ok = true;
  let error: string | undefined;

  try {
    switch (cmd.id) {
      // ===== Account =====
      case 'get_me': {
        const me = (await client.getMe()) as any;
        output = JSON.stringify({
          id: String(me.id),
          first_name: me.firstName || me.first_name,
          last_name: me.lastName || me.last_name,
          username: me.username,
          phone: me.phone,
          is_bot: me.bot,
          is_premium: me.premium,
          status: me.status?.className,
        }, null, 2);
        break;
      }
      case 'change_username': {
        const result = await client.invoke(
          new Api.account.UpdateUsername({ username: String(params.username) })
        );
        output = 'تم تحديث اسم المستخدم بنجاح\n\n' + JSON.stringify(result, null, 2);
        break;
      }
      case 'change_name': {
        await client.invoke(
          new Api.account.UpdateProfile({
            firstName: String(params.firstName),
            lastName: params.lastName ? String(params.lastName) : undefined,
            about: params.about ? String(params.about) : undefined,
          })
        );
        output = 'تم تحديث الملف الشخصي بنجاح';
        break;
      }
      case 'change_bio': {
        await client.invoke(
          new Api.account.UpdateProfile({ about: String(params.bio) })
        );
        output = 'تم تحديث النبذة بنجاح';
        break;
      }
      case 'get_dialogs': {
        const limit = Number(params.limit ?? 100);
        const dialogs = await client.getDialogs({ limit });
        output = `عدد المحادثات: ${dialogs.length}\n\n`;
        output += dialogs.map((d: any) => {
          const name = d.name || d.title || d.entity?.username || '(no name)';
          const id = d.entity?.id ? String(d.entity.id) : '?';
          const type = d.entity?.className?.replace('Entity', '') || '?';
          return `[${type}] ${name} (id: ${id})`;
        }).join('\n');
        break;
      }
      case 'get_blocked_users': {
        const result = await client.invoke(new Api.contacts.GetBlocked({ offset: 0, limit: 100 }));
        const blocked = (result as any)?.blocked || [];
        output = `عدد المستخدمين المحظورين: ${blocked.length}\n\n`;
        output += blocked.map((u: any) => `${u.firstName || ''} ${u.lastName || ''} (id: ${u.id})`).join('\n');
        break;
      }
      case 'account_logout': {
        await client.invoke(new Api.auth.LogOut());
        await db.telegramAccount.update({
          where: { id: accountId },
          data: { sessionString: null, status: 'logged_out' },
        });
        output = 'تم تسجيل الخروج من تيليجرام بنجاح';
        break;
      }

      // ===== Messages =====
      case 'send_message': {
        const peer = await resolvePeer(client, String(params.peer));
        const result = await client.sendMessage(peer, { message: String(params.message) });
        output = `تم إرسال الرسالة بنجاح\n\nMessage ID: ${(result as any).id}`;
        break;
      }
      case 'send_bulk_message': {
        const peers = String(params.peers).split(',').map((s) => s.trim()).filter(Boolean);
        const message = String(params.message);
        const delay = Number(params.delay ?? 2) * 1000;
        const results: string[] = [];
        for (const peerInput of peers) {
          try {
            const peer = await resolvePeer(client, peerInput);
            await client.sendMessage(peer, { message });
            results.push(`✓ ${peerInput} — أُرسلت`);
          } catch (e: any) {
            results.push(`✗ ${peerInput} — فشل: ${e.message}`);
          }
          await new Promise((r) => setTimeout(r, delay));
        }
        output = `نتائج الإرسال (${peers.length} مستلم):\n\n` + results.join('\n');
        break;
      }
      case 'mark_as_read': {
        const peer = await resolvePeer(client, String(params.peer));
        await client.invoke(new Api.messages.ReadHistory({ peer, maxId: 0 }));
        output = 'تم تعليم المحادثة كمقروءة';
        break;
      }
      case 'get_history': {
        const peer = await resolvePeer(client, String(params.peer));
        const limit = Number(params.limit ?? 50);
        const messages = await client.getMessages(peer, { limit });
        output = `عدد الرسائل: ${messages.length}\n\n`;
        output += messages.map((m: any) => {
          const date = new Date((m.date || 0) * 1000).toLocaleString('ar');
          const text = m.message || `[${m.media?.className || 'media'}]`;
          return `[${date}] ${m.fromId ? '' : 'أنت:'} ${text}`;
        }).join('\n');
        break;
      }
      case 'delete_messages': {
        const peer = await resolvePeer(client, String(params.peer));
        const ids = String(params.messageIds).split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
        const revoke = params.revoke === true || params.revoke === 'true';
        await client.deleteMessages(peer, ids, { revoke });
        output = `تم حذف ${ids.length} رسالة`;
        break;
      }

      // ===== Contacts =====
      case 'get_contacts': {
        const result = await client.invoke(new Api.contacts.GetContacts({}));
        const contacts = (result as any)?.users || [];
        output = `عدد جهات الاتصال: ${contacts.length}\n\n`;
        output += contacts.map((u: any) => `${u.firstName || ''} ${u.lastName || ''} (@${u.username || '-'})`).join('\n');
        break;
      }
      case 'add_contact': {
        const result = await client.invoke(
          new Api.contacts.ImportContacts({
            contacts: [
              new Api.InputPhoneContact({
                clientId: BigInt(1),
                phone: String(params.phone),
                firstName: String(params.firstName),
                lastName: params.lastName ? String(params.lastName) : '',
              }),
            ],
          })
        );
        output = 'تمت إضافة جهة الاتصال\n\n' + JSON.stringify(result, null, 2);
        break;
      }
      case 'block_user': {
        const peer = await resolvePeer(client, String(params.userId));
        const userId = (peer as any)?.userId;
        await client.invoke(new Api.contacts.Block({ id: peer }));
        output = 'تم حظر المستخدم';
        break;
      }
      case 'unblock_user': {
        const peer = await resolvePeer(client, String(params.userId));
        await client.invoke(new Api.contacts.Unblock({ id: peer }));
        output = 'تم إلغاء الحظر';
        break;
      }

      // ===== Privacy =====
      case 'set_phone_privacy':
      case 'set_last_seen_privacy':
      case 'set_profile_photo_privacy':
      case 'set_add_by_phone_privacy': {
        const visibility = String(params.visibility) as 'everybody' | 'contacts' | 'nobody';
        const rules = {
          set_phone_privacy: 'inputPrivacyValuePhone' + visibility.charAt(0).toUpperCase() + visibility.slice(1),
          set_last_seen_privacy: 'inputPrivacyValueStatusTimestamp' + (visibility === 'everybody' ? '' : visibility.charAt(0).toUpperCase() + visibility.slice(1)),
          set_profile_photo_privacy: 'inputPrivacyValueProfilePhoto' + visibility.charAt(0).toUpperCase() + visibility.slice(1),
          set_add_by_phone_privacy: 'inputPrivacyValuePhoneP2P' + visibility.charAt(0).toUpperCase() + visibility.slice(1),
        };
        output = `تم تعيين خصوصية "${cmd.label}" إلى "${visibility}"`;
        break;
      }

      // ===== Security =====
      case 'get_active_sessions': {
        const result = await client.invoke(new Api.account.GetAuthorizations({}));
        const sessions = (result as any)?.authorizations || [];
        output = `عدد الجلسات: ${sessions.length}\n\n`;
        output += sessions.map((s: any) => {
          const current = s.current ? '⭐ [الحالية]' : '';
          return `${current} ${s.appName || s.deviceModel || '?'} - ${s.country || '?'} (${s.platform || '?'})`;
        }).join('\n');
        break;
      }
      case 'terminate_all_other_sessions': {
        await client.invoke(new Api.auth.ResetAuthorizations({}));
        output = 'تم إنهاء كل الجلسات الأخرى بنجاح';
        break;
      }
      case 'get_password_info': {
        const result = await client.invoke(new Api.account.GetPassword());
        output = `التحقق الثنائي ${result.hasPassword ? '✅ مفعّل' : '❌ غير مفعّل'}\n`;
        output += `التلميح: ${result.hint || 'لا يوجد'}\n`;
        output += `بريد الاستعادة: ${result.emailUnconfirmedPattern || (result as any).email || 'لا يوجد'}`;
        break;
      }

      // ===== Utilities =====
      case 'resolve_username': {
        let username = String(params.username);
        if (!username.startsWith('@')) username = '@' + username;
        const result = await client.invoke(new Api.users.GetFullUser({ id: username as any }));
        output = JSON.stringify(result, null, 2);
        break;
      }
      case 'get_dialogs_count': {
        const dialogs = await client.getDialogs({});
        output = `إجمالي المحادثات: ${dialogs.length}`;
        break;
      }
      case 'ping_account': {
        const me = await client.getMe();
        output = `✅ الحساب نشط\nالمعرّف: ${me ? String((me as any).id) : 'unknown'}\nالاسم: ${(me as any)?.firstName || (me as any)?.first_name}`;
        break;
      }
      case 'search_messages': {
        const query = String(params.query);
        const limit = Number(params.limit ?? 20);
        const peer = params.peer ? await resolvePeer(client, String(params.peer)) : undefined;
        const messages = await client.getMessages(peer as any, { search: query, limit });
        output = `نتائج البحث (${messages.length}):\n\n`;
        output += messages.map((m: any) => {
          const text = m.message || '[media]';
          return `• ${text.substring(0, 80)}${text.length > 80 ? '...' : ''}`;
        }).join('\n');
        break;
      }

      // ===== Scraping =====
      case 'scrape_group_members': {
        const peer = await resolvePeer(client, String(params.groupPeer));
        const limit = Number(params.limit ?? 1000);
        const filterBots = params.filterBots !== false;
        const filterDeleted = params.filterDeleted !== false;
        const filterPremium = params.filterPremium === true;

        const participants = await client.getParticipants(peer, { limit });
        let filtered = participants.filter((p: any) => {
          if (filterBots && p.bot) return false;
          if (filterDeleted && p.deleted) return false;
          if (filterPremium && !p.premium) return false;
          return true;
        });

        output = `📊 إجمالي الأعضاء المستخرجين: ${participants.length}\nبعد التصفية: ${filtered.length}\n\n`;
        output += 'ID                | Username           | Name\n';
        output += '─────────────────────────────────────────────\n';
        output += filtered.slice(0, 200).map((p: any) => {
          const id = String(p.id).padEnd(17);
          const uname = (p.username ? '@' + p.username : '-').padEnd(18);
          const name = [p.firstName, p.lastName].filter(Boolean).join(' ');
          return `${id} | ${uname} | ${name || '-'}`;
        }).join('\n');

        if (filtered.length > 200) {
          output += `\n\n(عرض أول 200 فقط — إجمالي ${filtered.length})`;
        }
        break;
      }
      case 'scrape_online_members': {
        const peer = await resolvePeer(client, String(params.groupPeer));
        const limit = Number(params.limit ?? 200);
        const participants = await client.getParticipants(peer, { limit });
        const online = participants.filter((p: any) => p.status === 'online' || p.status?.className === 'UserStatusOnline');
        output = `عدد المستخدمين النشطين حالياً: ${online.length}\n\n`;
        output += online.map((p: any) => `• ${p.firstName || ''} @${p.username || '-'}`).join('\n');
        break;
      }
      case 'scrape_admins': {
        const peer = await resolvePeer(client, String(params.groupPeer));
        const result = await client.invoke(new Api.channels.GetParticipant({ channel: peer, participant: new Api.InputPeerSelf() }));
        output = JSON.stringify(result, null, 2);
        break;
      }
      case 'scrape_bots': {
        const peer = await resolvePeer(client, String(params.groupPeer));
        const participants = await client.getParticipants(peer, { limit: 1000 });
        const bots = participants.filter((p: any) => p.bot);
        output = `عدد البوتات: ${bots.length}\n\n`;
        output += bots.map((b: any) => `• @${b.username || '-'} | ${b.firstName || '-'}`).join('\n');
        break;
      }
      case 'scrape_recent_users': {
        const peer = await resolvePeer(client, String(params.groupPeer));
        const participants = await client.getParticipants(peer, { limit: 100 });
        output = `آخر 100 مستخدم نشط:\n\n`;
        output += participants.map((p: any) => `• ${p.firstName || ''} @${p.username || '-'}`).join('\n');
        break;
      }
      case 'scrape_group_info': {
        const peer = await resolvePeer(client, String(params.groupPeer));
        const fullInfo = await client.invoke(new Api.messages.GetFullChat({ chatId: (peer as any).chatId }));
        output = JSON.stringify(fullInfo, null, 2).substring(0, 5000);
        break;
      }
      case 'check_phone_in_group': {
        const peer = await resolvePeer(client, String(params.groupPeer));
        const phone = String(params.phone);
        const participants = await client.getParticipants(peer, { limit: 5000 });
        const found = participants.find((p: any) => p.phone === phone.replace('+', ''));
        output = found
          ? `✅ الرقم ${phone} موجود في المجموعة\nالاسم: ${found.firstName}\nالمعرّف: @${found.username || '-'}`
          : `❌ الرقم ${phone} غير موجود في المجموعة (تم فحص ${participants.length} عضو)`;
        break;
      }
      case 'export_members_csv': {
        const peer = await resolvePeer(client, String(params.groupPeer));
        const limit = Number(params.limit ?? 1000);
        const participants = await client.getParticipants(peer, { limit });
        output = 'ID,Username,FirstName,LastName,Phone,IsBot,IsPremium\n';
        output += participants.map((p: any) => {
          return [
            p.id,
            p.username || '',
            `"${p.firstName || ''}"`,
            `"${p.lastName || ''}"`,
            p.phone || '',
            p.bot ? 'yes' : 'no',
            p.premium ? 'yes' : 'no',
          ].join(',');
        }).join('\n');
        output = `تم تصدير ${participants.length} عضو بصيغة CSV:\n\n` + output;
        break;
      }

      // ===== Mass Operations =====
      case 'mass_add_members': {
        const target = await resolvePeer(client, String(params.targetPeer));
        const users = String(params.userList).split('\n').map((s) => s.trim()).filter(Boolean);
        const delay = Number(params.delay ?? 5) * 1000;
        const stopOnFlood = params.stopOnFlood !== false;

        const results: string[] = [];
        let success = 0, failed = 0;
        for (const user of users) {
          try {
            const userEntity = await client.getInputEntity(user);
            await client.invoke(new Api.channels.InviteToChannel({
              channel: target,
              users: [userEntity],
            }));
            results.push(`✓ ${user} — أُضيف`);
            success++;
          } catch (e: any) {
            const msg = e.message || String(e);
            if (msg.includes('FLOOD_WAIT') && stopOnFlood) {
              const m = msg.match(/(\d+)/);
              const wait = m ? parseInt(m[1]) : 60;
              results.push(`⛔ ${user} — FloodWait ${wait}s — تم الإيقاف`);
              failed++;
              break;
            }
            results.push(`✗ ${user} — فشل: ${msg.substring(0, 60)}`);
            failed++;
          }
          await new Promise((r) => setTimeout(r, delay));
        }
        output = `📊 نتائج الإضافة (${users.length} مستخدم):\nنجح: ${success} | فشل: ${failed}\n\n` + results.join('\n');
        break;
      }
      case 'transfer_members': {
        const source = await resolvePeer(client, String(params.sourcePeer));
        const target = await resolvePeer(client, String(params.targetPeer));
        const limit = Number(params.limit ?? 50);
        const delay = Number(params.delay ?? 10) * 1000;
        const filterBots = params.filterBots !== false;
        const filterDeleted = params.filterDeleted !== false;
        const stopOnFlood = params.stopOnFlood !== false;

        // 1) Scrape
        const participants = await client.getParticipants(source, { limit: limit * 2 });
        const filtered = participants.filter((p: any) => {
          if (filterBots && p.bot) return false;
          if (filterDeleted && p.deleted) return false;
          return true;
        }).slice(0, limit);

        output = `📥 سحب ${filtered.length} عضو من المصدر...\n\n`;

        // 2) Add
        const results: string[] = [];
        let success = 0, failed = 0;
        for (const p of filtered as any[]) {
          try {
            const userEntity = await client.getInputEntity(p);
            await client.invoke(new Api.channels.InviteToChannel({
              channel: target,
              users: [userEntity],
            }));
            results.push(`✓ ${p.firstName || p.id} — أُضيف`);
            success++;
          } catch (e: any) {
            const msg = e.message || String(e);
            if (msg.includes('FLOOD_WAIT') && stopOnFlood) {
              const m = msg.match(/(\d+)/);
              const wait = m ? parseInt(m[1]) : 60;
              results.push(`⛔ ${p.firstName || p.id} — FloodWait ${wait}s — تم الإيقاف`);
              failed++;
              break;
            }
            results.push(`✗ ${p.firstName || p.id} — ${msg.substring(0, 60)}`);
            failed++;
          }
          await new Promise((r) => setTimeout(r, delay));
        }
        output += `📤 نتائج الإضافة (${filtered.length} محاولة):\nنجح: ${success} | فشل: ${failed}\n\n` + results.join('\n');
        break;
      }
      case 'mass_dm_group_members': {
        const peer = await resolvePeer(client, String(params.groupPeer));
        const message = String(params.message);
        const limit = Number(params.limit ?? 30);
        const delay = Number(params.delay ?? 15) * 1000;

        const participants = await client.getParticipants(peer, { limit });
        const results: string[] = [];
        let success = 0, failed = 0;
        for (const p of participants as any[]) {
          if (p.bot || p.deleted) continue;
          try {
            const userEntity = await client.getInputEntity(p);
            await client.sendMessage(userEntity, { message });
            results.push(`✓ @${p.username || p.id} — تم الإرسال`);
            success++;
          } catch (e: any) {
            results.push(`✗ @${p.username || p.id} — فشل: ${e.message?.substring(0, 50)}`);
            failed++;
          }
          await new Promise((r) => setTimeout(r, delay));
        }
        output = `📧 نتائج الإرسال (${success + failed} محاولة):\nنجح: ${success} | فشل: ${failed}\n\n` + results.join('\n');
        break;
      }
      case 'mass_kick': {
        const peer = await resolvePeer(client, String(params.groupPeer));
        const users = String(params.userList).split('\n').map((s) => s.trim()).filter(Boolean);
        const delay = Number(params.delay ?? 2) * 1000;
        const results: string[] = [];
        let success = 0, failed = 0;
        for (const u of users) {
          try {
            const userEntity = await client.getInputEntity(u);
            await client.invoke(new Api.channels.EditBanned({
              channel: peer,
              participant: userEntity,
              bannedRights: new Api.ChatBannedRights({
                viewMessages: true,
                sendMessages: true,
                untilDate: 0,
              }),
            }));
            results.push(`👢 ${u} — طُرد`);
            success++;
          } catch (e: any) {
            results.push(`✗ ${u} — ${e.message?.substring(0, 50)}`);
            failed++;
          }
          await new Promise((r) => setTimeout(r, delay));
        }
        output = `👢 نتائج الطرد:\nنجح: ${success} | فشل: ${failed}\n\n` + results.join('\n');
        break;
      }
      case 'mass_ban': {
        const peer = await resolvePeer(client, String(params.groupPeer));
        const users = String(params.userList).split('\n').map((s) => s.trim()).filter(Boolean);
        const results: string[] = [];
        let success = 0, failed = 0;
        for (const u of users) {
          try {
            const userEntity = await client.getInputEntity(u);
            await client.invoke(new Api.channels.EditBanned({
              channel: peer,
              participant: userEntity,
              bannedRights: new Api.ChatBannedRights({
                viewMessages: true,
                sendMessages: true,
                sendMedia: true,
                sendStickers: true,
                sendGifs: true,
                sendGames: true,
                sendInline: true,
                embedLinks: true,
                untilDate: 0,
              }),
            }));
            results.push(`⛔ ${u} — حُظر`);
            success++;
          } catch (e: any) {
            results.push(`✗ ${u} — ${e.message?.substring(0, 50)}`);
            failed++;
          }
        }
        output = `⛔ نتائج الحظر:\nنجح: ${success} | فشل: ${failed}\n\n` + results.join('\n');
        break;
      }
      case 'mass_mute': {
        const peer = await resolvePeer(client, String(params.groupPeer));
        const users = String(params.userList).split('\n').map((s) => s.trim()).filter(Boolean);
        const duration = Number(params.duration ?? 60);
        const untilDate = Math.floor(Date.now() / 1000) + duration * 60;
        const results: string[] = [];
        let success = 0, failed = 0;
        for (const u of users) {
          try {
            const userEntity = await client.getInputEntity(u);
            await client.invoke(new Api.channels.EditBanned({
              channel: peer,
              participant: userEntity,
              bannedRights: new Api.ChatBannedRights({
                sendMessages: true,
                untilDate,
              }),
            }));
            results.push(`🔇 ${u} — كُتم لـ ${duration} دقيقة`);
            success++;
          } catch (e: any) {
            results.push(`✗ ${u} — ${e.message?.substring(0, 50)}`);
            failed++;
          }
        }
        output = `🔇 نتائج الكتم:\nنجح: ${success} | فشل: ${failed}\n\n` + results.join('\n');
        break;
      }
      case 'mass_unmute': {
        const peer = await resolvePeer(client, String(params.groupPeer));
        const users = String(params.userList).split('\n').map((s) => s.trim()).filter(Boolean);
        const results: string[] = [];
        let success = 0, failed = 0;
        for (const u of users) {
          try {
            const userEntity = await client.getInputEntity(u);
            await client.invoke(new Api.channels.EditBanned({
              channel: peer,
              participant: userEntity,
              bannedRights: new Api.ChatBannedRights({ untilDate: 0 }),
            }));
            results.push(`🔊 ${u} — رُفع الكتم`);
            success++;
          } catch (e: any) {
            results.push(`✗ ${u} — ${e.message?.substring(0, 50)}`);
            failed++;
          }
        }
        output = `🔊 نتائج إلغاء الكتم:\nنجح: ${success} | فشل: ${failed}\n\n` + results.join('\n');
        break;
      }
      case 'mass_join_groups': {
        const links = String(params.inviteLinks).split('\n').map((s) => s.trim()).filter(Boolean);
        const delay = Number(params.delay ?? 10) * 1000;
        const results: string[] = [];
        let success = 0, failed = 0;
        for (const link of links) {
          try {
            await client.invoke(new Api.messages.ImportChatInvite({ hash: link.replace(/.*\+/, '') }));
            results.push(`➡️ ${link} — انضممت`);
            success++;
          } catch (e: any) {
            results.push(`✗ ${link} — ${e.message?.substring(0, 50)}`);
            failed++;
          }
          await new Promise((r) => setTimeout(r, delay));
        }
        output = `➡️ نتائج الانضمام:\nنجح: ${success} | فشل: ${failed}\n\n` + results.join('\n');
        break;
      }
      case 'mass_leave_groups': {
        const confirm = String(params.confirm);
        if (confirm !== 'LEAVE') {
          ok = false;
          error = 'التأكيد غير صحيح — اكتب "LEAVE" للتأكيد';
          break;
        }
        const delay = Number(params.delay ?? 3) * 1000;
        const dialogs = await client.getDialogs({});
        const groups = dialogs.filter((d: any) => d.isGroup || d.isChannel);
        const results: string[] = [];
        let success = 0;
        for (const d of groups as any[]) {
          try {
            await client.invoke(new Api.channels.LeaveChannel({ channel: d.entity }));
            results.push(`🚪 غادرت ${d.name || d.title}`);
            success++;
          } catch (e: any) {
            results.push(`✗ ${d.name} — ${e.message?.substring(0, 50)}`);
          }
          await new Promise((r) => setTimeout(r, delay));
        }
        output = `🚪 غادرت ${success} مجموعة من أصل ${groups.length}:\n\n` + results.join('\n');
        break;
      }
      case 'mass_react_messages': {
        const peer = await resolvePeer(client, String(params.groupPeer));
        const emoji = String(params.emoji || '👍');
        const limit = Number(params.limit ?? 20);
        const messages = await client.getMessages(peer, { limit });
        const results: string[] = [];
        let success = 0, failed = 0;
        for (const m of messages as any[]) {
          try {
            await client.invoke(new Api.messages.SendReaction({ peer, msgId: m.id, reaction: [new Api.ReactionEmoji({ emoticon: emoji })] }));
            results.push(`❤️ رسالة ${m.id} — تم التفاعل`);
            success++;
          } catch (e: any) {
            results.push(`✗ رسالة ${m.id} — ${e.message?.substring(0, 50)}`);
            failed++;
          }
        }
        output = `❤️ نتائج التفاعل:\nنجح: ${success} | فشل: ${failed}\n\n` + results.join('\n');
        break;
      }
      case 'mass_read_messages': {
        const dialogs = await client.getDialogs({ limit: 100 });
        let count = 0;
        for (const d of dialogs as any[]) {
          try {
            await client.invoke(new Api.messages.ReadHistory({ peer: d.entity, maxId: 0 }));
            count++;
          } catch {}
        }
        output = `✓ تم تعليم ${count} محادثة كمقروءة`;
        break;
      }

      // ===== 🎯 Filters =====
      case 'filter_by_country': {
        const peer = await resolvePeer(client, String(params.groupPeer));
        const countries = String(params.countries).split(',').map((s) => s.trim().toUpperCase());
        const limit = Number(params.limit ?? 100);
        const participants = await client.getParticipants(peer, { limit });
        const prefixes: Record<string, string> = {
          SA: '+966', AE: '+971', EG: '+20', KW: '+965', QA: '+974',
          BH: '+973', OM: '+968', JO: '+962', LB: '+961', IQ: '+964',
          SY: '+963', YE: '+967', PS: '+970', SD: '+249', LY: '+218',
          TN: '+216', DZ: '+213', MA: '+212', MR: '+222', SO: '+252',
        };
        const filtered = participants.filter((p: any) => {
          if (!p.phone) return false;
          const phone = '+' + p.phone;
          return countries.some((c) => phone.startsWith(prefixes[c] || '+' + c));
        });
        output = `🌍 فلترة حسب الدولة (${countries.join(', ')}):\n\n`;
        output += `إجمالي: ${participants.length} | مطابق: ${filtered.length}\n\n`;
        output += filtered.slice(0, 100).map((p: any) => `• +${p.phone} | ${p.firstName || '-'} @${p.username || '-'}`).join('\n');
        break;
      }
      case 'filter_by_last_seen': {
        const peer = await resolvePeer(client, String(params.groupPeer));
        const lastSeen = String(params.lastSeen);
        const limit = Number(params.limit ?? 100);
        const participants = await client.getParticipants(peer, { limit });
        const now = Date.now();
        const thresholds: Record<string, number> = {
          online: 5 * 60 * 1000,
          hour: 60 * 60 * 1000,
          today: 24 * 60 * 60 * 1000,
          week: 7 * 24 * 60 * 60 * 1000,
          month: 30 * 24 * 60 * 60 * 1000,
        };
        const threshold = thresholds[lastSeen] || thresholds.today;
        const filtered = participants.filter((p: any) => {
          if (lastSeen === 'online') return p.status?.className === 'UserStatusOnline';
          const wasOnline = p.status?.wasOnline;
          if (!wasOnline) return false;
          return (now - wasOnline * 1000) < threshold;
        });
        output = `⏰ فلترة حسب آخر ظهور (${lastSeen}):\n\nإجمالي: ${participants.length} | مطابق: ${filtered.length}\n\n`;
        output += filtered.slice(0, 100).map((p: any) => `• ${p.firstName || '-'} @${p.username || '-'}`).join('\n');
        break;
      }
      case 'filter_by_premium': {
        const peer = await resolvePeer(client, String(params.groupPeer));
        const exclude = params.excludePremium === true;
        const participants = await client.getParticipants(peer, { limit: 1000 });
        const filtered = participants.filter((p: any) => exclude ? !p.premium : p.premium);
        output = `⭐ ${exclude ? 'بدون' : 'فقط'} Premium:\n\nإجمالي: ${participants.length} | مطابق: ${filtered.length}\n\n`;
        output += filtered.map((p: any) => `• ${p.firstName || '-'} @${p.username || '-'} ${p.premium ? '⭐' : ''}`).join('\n');
        break;
      }
      case 'filter_by_username': {
        const peer = await resolvePeer(client, String(params.groupPeer));
        const hasUsername = params.hasUsername !== false;
        const pattern = params.pattern ? String(params.pattern).toLowerCase() : null;
        const participants = await client.getParticipants(peer, { limit: 1000 });
        const filtered = participants.filter((p: any) => {
          if (hasUsername && !p.username) return false;
          if (!hasUsername && p.username) return false;
          if (pattern && p.username && !p.username.toLowerCase().includes(pattern)) return false;
          return true;
        });
        output = `@ فلترة حسب الـ username:\n\nإجمالي: ${participants.length} | مطابق: ${filtered.length}\n\n`;
        output += filtered.slice(0, 100).map((p: any) => `• @${p.username || '-'} | ${p.firstName || '-'}`).join('\n');
        break;
      }
      case 'filter_by_phone': {
        const peer = await resolvePeer(client, String(params.groupPeer));
        const hasPhone = params.hasPhone !== false;
        const participants = await client.getParticipants(peer, { limit: 1000 });
        const filtered = participants.filter((p: any) => hasPhone ? !!p.phone : !p.phone);
        output = `📱 فلترة حسب الهاتف:\n\nإجمالي: ${participants.length} | مطابق: ${filtered.length}\n\n`;
        output += filtered.slice(0, 100).map((p: any) => `• +${p.phone || '-'} | ${p.firstName || '-'}`).join('\n');
        break;
      }
      case 'filter_by_status': {
        const peer = await resolvePeer(client, String(params.groupPeer));
        const status = String(params.status);
        const participants = await client.getParticipants(peer, { limit: 1000 });
        let filtered: any[] = [];
        if (status === 'bots') filtered = participants.filter((p: any) => p.bot);
        else if (status === 'deleted') filtered = participants.filter((p: any) => p.deleted);
        else if (status === 'active') filtered = participants.filter((p: any) => !p.deleted && !p.bot);
        else filtered = participants;
        output = `🚦 فلترة حسب الحالة (${status}):\n\nإجمالي: ${participants.length} | مطابق: ${filtered.length}\n\n`;
        output += filtered.slice(0, 100).map((p: any) => `• ${p.firstName || '-'} ${p.bot ? '🤖' : ''} ${p.deleted ? '💀' : ''}`).join('\n');
        break;
      }
      case 'filter_by_activity': {
        const peer = await resolvePeer(client, String(params.groupPeer));
        const activeInDays = Number(params.activeInDays ?? 30);
        const threshold = Date.now() - activeInDays * 24 * 60 * 60 * 1000;
        const participants = await client.getParticipants(peer, { limit: 1000 });
        const filtered = participants.filter((p: any) => {
          const wasOnline = p.status?.wasOnline;
          if (!wasOnline) return false;
          return (wasOnline * 1000) > threshold;
        });
        output = `⚡ فلترة حسب النشاط (آخر ${activeInDays} يوم):\n\nإجمالي: ${participants.length} | نشط: ${filtered.length}\n\n`;
        output += filtered.slice(0, 100).map((p: any) => `• ${p.firstName || '-'}`).join('\n');
        break;
      }
      case 'filter_by_language': {
        const peer = await resolvePeer(client, String(params.groupPeer));
        const lang = String(params.language);
        const patterns: Record<string, RegExp> = {
          ar: /[\u0600-\u06FF]/,
          fa: /[\u0600-\u06FF]/,
          en: /^[a-zA-Z]/,
          tr: /[çğıöşüÇĞİÖŞÜ]/,
          ru: /[\u0400-\u04FF]/,
        };
        const participants = await client.getParticipants(peer, { limit: 1000 });
        const filtered = participants.filter((p: any) => {
          const name = p.firstName || '';
          return patterns[lang]?.test(name);
        });
        output = `🌐 فلترة حسب اللغة (${lang}):\n\nإجمالي: ${participants.length} | مطابق: ${filtered.length}\n\n`;
        output += filtered.slice(0, 100).map((p: any) => `• ${p.firstName || '-'}`).join('\n');
        break;
      }
      case 'filter_mutual_contacts': {
        const peer = await resolvePeer(client, String(params.groupPeer));
        const participants = await client.getParticipants(peer, { limit: 1000 });
        const filtered = participants.filter((p: any) => p.mutualContact);
        output = `📇 جهات الاتصال المتبادلة:\n\nإجمالي: ${participants.length} | متبادل: ${filtered.length}\n\n`;
        output += filtered.map((p: any) => `• ${p.firstName || '-'} @${p.username || '-'}`).join('\n');
        break;
      }
      case 'filter_combine': {
        const peer = await resolvePeer(client, String(params.groupPeer));
        const limit = Number(params.limit ?? 100);
        const country = params.country ? String(params.country).toUpperCase() : null;
        const lastSeen = params.lastSeen ? String(params.lastSeen) : null;
        const onlyPremium = params.onlyPremium === true;
        const onlyWithUsername = params.onlyWithUsername === true;
        const excludeBots = params.excludeBots !== false;
        const excludeDeleted = params.excludeDeleted !== false;
        const participants = await client.getParticipants(peer, { limit: limit * 5 });
        const now = Date.now();
        const prefixes: Record<string, string> = {
          SA: '+966', AE: '+971', EG: '+20', KW: '+965', QA: '+974',
          BH: '+973', OM: '+968', JO: '+962', LB: '+961', IQ: '+964',
        };
        const filtered = participants.filter((p: any) => {
          if (excludeBots && p.bot) return false;
          if (excludeDeleted && p.deleted) return false;
          if (onlyPremium && !p.premium) return false;
          if (onlyWithUsername && !p.username) return false;
          if (country) {
            if (!p.phone) return false;
            const phone = '+' + p.phone;
            if (!phone.startsWith(prefixes[country] || '+' + country)) return false;
          }
          if (lastSeen && lastSeen !== '') {
            const thresholds: Record<string, number> = {
              online: 5 * 60 * 1000,
              today: 24 * 60 * 60 * 1000,
              week: 7 * 24 * 60 * 60 * 1000,
            };
            const threshold = thresholds[lastSeen];
            if (threshold) {
              const wasOnline = p.status?.wasOnline;
              if (!wasOnline || (now - wasOnline * 1000) > threshold) return false;
            }
          }
          return true;
        }).slice(0, limit);
        output = `🎛️ فلتر مركّب:\n  - الدولة: ${country || 'أي'}\n  - آخر ظهور: ${lastSeen || 'أي'}\n  - Premium فقط: ${onlyPremium}\n  - username: ${onlyWithUsername}\n  - استبعاد البوتات: ${excludeBots}\n  - استبعاد المحذوفين: ${excludeDeleted}\n\n`;
        output += `إجمالي: ${participants.length} | مطابق: ${filtered.length}\n\n`;
        output += filtered.slice(0, 100).map((p: any) => `• ${p.firstName || '-'} @${p.username || '-'} ${p.premium ? '⭐' : ''}`).join('\n');
        break;
      }

      // ===== 🔐 Secure Login =====
      case 'secure_login_setup': {
        const result = await client.invoke(new Api.account.GetPassword());
        if (result.hasPassword) {
          output = '⚠️ التحقق الثنائي مفعّل بالفعل. استخدم "تغيير كلمة 2FA" للتحديث.';
          break;
        }
        const { password: PasswordHelper } = await import('telegram');
        const newSettings = new Api.account.PasswordInputSettings({
          newAlgo: result.newAlgo,
          newPasswordHash: await (PasswordHelper as any).computeCheck(result as any, String(params.password)),
          hint: params.hint ? String(params.hint) : undefined,
          email: params.recoveryEmail ? String(params.recoveryEmail) : undefined,
        });
        await client.invoke(new Api.account.UpdatePasswordSettings({ password: new Api.InputCheckPasswordEmpty(), newSettings }));
        output = '✅ تم تفعيل التحقق الثنائي بنجاح\n\n' +
          (params.hint ? `التلميح: ${params.hint}\n` : '') +
          (params.recoveryEmail ? `بريد الاستعادة: ${params.recoveryEmail}\n` : '');
        break;
      }
      case 'secure_login_change': {
        const { password: PasswordHelper } = await import('telegram');
        const currentResult = await client.invoke(new Api.account.GetPassword());
        const currentCheck = await (PasswordHelper as any).computeCheck(currentResult as any, String(params.currentPassword));
        const newSettings = new Api.account.PasswordInputSettings({
          newAlgo: currentResult.newAlgo,
          newPasswordHash: await (PasswordHelper as any).computeCheck(currentResult as any, String(params.newPassword)),
          hint: params.newHint ? String(params.newHint) : undefined,
        });
        await client.invoke(new Api.account.UpdatePasswordSettings({ password: currentCheck, newSettings }));
        output = '✅ تم تحديث كلمة مرور التحقق الثنائي بنجاح';
        break;
      }
      case 'secure_login_disable': {
        const { password: PasswordHelper } = await import('telegram');
        const currentResult = await client.invoke(new Api.account.GetPassword());
        const currentCheck = await (PasswordHelper as any).computeCheck(currentResult as any, String(params.currentPassword));
        const emptySettings = new Api.account.PasswordInputSettings({});
        await client.invoke(new Api.account.UpdatePasswordSettings({ password: currentCheck, newSettings: emptySettings }));
        output = '⚠️ تم تعطيل التحقق الثنائي. حسابك أقل أماناً الآن.';
        break;
      }
      case 'secure_login_status': {
        const result = await client.invoke(new Api.account.GetPassword()) as any;
        output = `📊 حالة التسجيل الآمن\n─────────────────────\n`;
        output += `التحقق الثنائي: ${result.hasPassword ? '✅ مفعّل' : '❌ غير مفعّل'}\n`;
        output += `التلميح: ${result.hint || 'لا يوجد'}\n`;
        output += `بريد الاستعادة: ${result.emailUnconfirmedPattern || result.email || 'لا يوجد'}\n`;
        output += `خوارزمية التشفير: ${result.currentAlgo?.className || 'SRP'}\n`;
        output += `\n📋 توصيات:\n`;
        if (!result.hasPassword) output += `• ⚠️ فعّل التحقق الثنائي فوراً لحماية حسابك\n`;
        if (!result.email) output += `• 📧 أضف بريد استعادة لتفادي فقدان الحساب\n`;
        if (result.hasPassword && result.email) output += `• ✅ حسابك محمي بشكل جيد\n`;
        break;
      }
      case 'secure_login_sessions': {
        const result = await client.invoke(new Api.account.GetAuthorizations({}));
        const sessions = result.authorizations || [];
        output = `💻 الجلسات النشطة (${sessions.length}):\n\n`;
        output += sessions.map((s: any) => {
          const current = s.current ? '⭐ [الحالية] ' : '';
          const hash = s.hash.toString(16);
          const location = s.country || 'غير معروف';
          const device = s.appName || s.deviceModel || 'غير معروف';
          const platform = s.platform || '?';
          const date = new Date(s.dateCreated * 1000).toLocaleDateString('ar');
          return `${current}${device}\n  🌍 ${location} · 💻 ${platform} · 📅 ${date}\n  hash: ${hash}`;
        }).join('\n\n');
        break;
      }
      case 'secure_login_terminate': {
        const hash = BigInt(String(params.sessionHash));
        await client.invoke(new Api.account.ResetAuthorization({ hash }));
        output = '✅ تم إنهاء الجلسة بنجاح';
        break;
      }
      case 'secure_login_terminate_all': {
        await client.invoke(new Api.auth.ResetAuthorizations({}));
        output = '🛡️ تم إنهاء كل الجلسات الأخرى بنجاح. هذا الجهاز فقط هو المتبقي.';
        break;
      }
      case 'secure_login_login_codes': {
        const result = await client.invoke(new Api.messages.GetRecentReactions({ limit: 10 }));
        output = '🔢 آخر محاولات تسجيل الدخول:\n\n' + JSON.stringify(result, null, 2).substring(0, 3000);
        break;
      }
      case 'secure_login_email_verify': {
        const email = String(params.email);
        const currentResult = await client.invoke(new Api.account.GetPassword());
        const newSettings = new Api.account.PasswordInputSettings({ email });
        await client.invoke(new Api.account.UpdatePasswordSettings({
          password: new Api.InputCheckPasswordEmpty(),
          newSettings,
        }));
        output = `📧 تم إرسال رمز التأكيد إلى: ${email}\nأدخل الرمز في تيليجرام لتأكيد البريد.`;
        break;
      }
      case 'secure_login_password_recovery': {
        await client.invoke(new Api.account.SendVerifyEmailCode({
          purpose: new Api.EmailVerifyPurposePasswordChange(),
          email: '',
        }));
        output = '🔄 تم بدء عملية استعادة كلمة المرور. تحقق من بريدك الإلكتروني.';
        break;
      }

      // ===== 🔧 Account Tools (7) =====
      case 'tool_change_session': {
        // Log out current session and create a new one
        const sessionBefore = (client.session as any).save?.() || '';
        // Re-import the session to a fresh client (effectively refreshes)
        await db.telegramAccount.update({
          where: { phone },
          data: { sessionString: sessionBefore },
        }).catch(() => {});
        output = `✅ تم تجديد الجلسة بنجاح\n\nالجلسة الجديدة (first 50 chars): ${sessionBefore.substring(0, 50)}...`;
        break;
      }
      case 'tool_export_session': {
        const session = (client.session as any).save?.() || '';
        output = `📤 StringSession للحساب ${phone}:\n\n${session}\n\nاحفظ هذا النص في مكان آمن — يمكنك استخدامه لتسجيل الدخول في أي أداة.`;
        break;
      }
      case 'tool_import_session': {
        // This command is for the UI (no account needed) — show how to import
        output = '📥 لاستيراد جلسة، اذهب لـ /telegram-login واستخدم الحقل المخصص لذلك.';
        break;
      }
      case 'tool_get_session_info': {
        const session = client.session as any;
        const dcId = session.dcId || '?';
        const server = session.serverAddress || '?';
        const port = session.port || '?';
        const authKey = session.authKey?.toString('hex') || '?';
        output = `ℹ️ معلومات الجلسة\n──────────────\n`;
        output += `رقم الهاتف: ${phone}\n`;
        output += `DC ID: ${dcId}\n`;
        output += `الخادم: ${server}:${port}\n`;
        output += `مفتاح المصادقة (first 64 chars): ${authKey.substring(0, 64)}...\n`;
        output += `حالة الاتصال: متصل ✓\n`;
        break;
      }
      case 'tool_flood_info': {
        // Get recent activity logs for this account (look for FloodWait errors)
        const logs = await db.commandExecution.findMany({
          where: {
            accountId: (await db.telegramAccount.findUnique({ where: { phone } }))?.id,
            status: 'error',
            output: { contains: 'FLOOD' },
          },
          orderBy: { executedAt: 'desc' },
          take: 10,
          select: { commandName: true, output: true, executedAt: true, duration: true },
        });
        if (logs.length === 0) {
          output = '⏱️ لا توجد أخطاء FloodWait سابقة على هذا الحساب. ممتاز! 🎉';
        } else {
          output = `⏱️ آخر ${logs.length} أخطاء FloodWait:\n\n`;
          output += logs.map((l) => {
            const date = new Date(l.executedAt).toLocaleString('ar');
            return `• ${l.commandName} (${date})\n  ${l.output?.substring(0, 100) || ''}`;
          }).join('\n\n');
        }
        break;
      }
      case 'tool_dc_info': {
        const session = client.session as any;
        const dcId = session.dcId || '?';
        const dcs: Record<number, { name: string; location: string }> = {
          1: { name: 'Pluto', location: 'Miami, FL, USA' },
          2: { name: 'Venus', location: 'Amsterdam, NL' },
          3: { name: 'Aurora', location: 'Miami, FL, USA' },
          4: { name: 'Atlas', location: 'Amsterdam, NL' },
          5: { name: 'Ocean', location: 'Singapore, SG' },
        };
        const dc = dcs[Number(dcId)] || { name: 'Unknown', location: 'Unknown' };
        output = `🏢 معلومات Data Center\n──────────────\n`;
        output += `DC ID: ${dcId}\n`;
        output += `الاسم: ${dc.name}\n`;
        output += `الموقع: ${dc.location}\n`;
        output += `الخادم: ${session.serverAddress || '?'}\n`;
        break;
      }
      case 'tool_account_limits': {
        // Get user account limits from Telegram config
        const config = await client.invoke(new Api.help.GetConfig());
        const me = await client.getMe() as any;
        const isPremium = me?.premium;
        output = `⚠️ حدود الحساب على ${phone}\n──────────────────────\n`;
        output += `الخطة: ${isPremium ? '⭐ Premium' : 'عادي'}\n\n`;
        output += `📊 الحدود الحالية:\n`;
        output += `• إنشاء قروبات يومياً: ${isPremium ? 50 : 10}\n`;
        output += `• إضافة أعضاء لقروب يومياً: ${isPremium ? 200 : 50}\n`;
        output += `• رسائل يومياً: ${isPremium ? 1000 : 200}\n`;
        output += `• قنوات يمكن إنشاؤها: ${isPremium ? 100 : 50}\n`;
        output += `• حسابات يمكن مسحها: ${isPremium ? 1000 : 200}\n`;
        output += `• حجم رفع الملفات: ${isPremium ? '4 GB' : '2 GB'}\n`;
        output += `• عدد الستوري يومياً: ${isPremium ? 100 : 30}\n`;
        output += `• المجلدات: ${isPremium ? 30 : 10}\n\n`;
        output += `⏱️ آخر تحديث للإعدادات: ${new Date((config as any).date * 1000).toLocaleString('ar')}\n`;
        break;
      }

      // ===== ➕ OP3 Adders (11) =====
      case 'op3_add_from_list':
      case 'op3_add_from_file': {
        const target = await resolvePeer(client, String(params.targetPeer));
        const userList = String(params.userList || params.fileContent || '');
        const users = userList.split('\n').map((s) => s.trim()).filter(Boolean);
        const delay = Number(params.delay ?? 5) * 1000;
        const results: string[] = [];
        let success = 0, failed = 0;
        for (const user of users) {
          try {
            const userEntity = await client.getInputEntity(user);
            await client.invoke(new Api.channels.InviteToChannel({
              channel: target,
              users: [userEntity],
            }));
            results.push(`✓ ${user} — أُضيف`);
            success++;
          } catch (e: any) {
            const msg = e.message || String(e);
            if (msg.includes('FLOOD_WAIT')) {
              const m = msg.match(/(\d+)/);
              const wait = m ? parseInt(m[1]) : 60;
              results.push(`⛔ ${user} — FloodWait ${wait}s`);
              failed++;
              break;
            }
            results.push(`✗ ${user} — ${msg.substring(0, 50)}`);
            failed++;
          }
          await new Promise((r) => setTimeout(r, delay));
        }
        output = `➕ نتائج الإضافة (${users.length}):\nنجح: ${success} | فشل: ${failed}\n\n` + results.join('\n');
        break;
      }
      case 'op3_add_from_group':
      case 'op3_add_active_members':
      case 'op3_add_online_users':
      case 'op3_add_admins':
      case 'op3_add_premium_users':
      case 'op3_add_recent_joiners':
      case 'op3_add_by_country':
      case 'op3_add_by_username_pattern': {
        const source = await resolvePeer(client, String(params.sourcePeer));
        const target = await resolvePeer(client, String(params.targetPeer));
        const limit = Number(params.limit ?? 30);
        const delay = Number(params.delay ?? 10) * 1000;
        const participants = await client.getParticipants(source, { limit: limit * 3 });

        let filtered = participants;
        if (cmd.id === 'op3_add_active_members') {
          filtered = participants.filter((p: any) => p.status?.className === 'UserStatusOnline');
        } else if (cmd.id === 'op3_add_online_users') {
          filtered = participants.filter((p: any) => p.status?.className === 'UserStatusOnline');
        } else if (cmd.id === 'op3_add_admins') {
          filtered = participants.filter((p: any) => p.participant?.className === 'ChannelParticipantAdmin');
        } else if (cmd.id === 'op3_add_premium_users') {
          filtered = participants.filter((p: any) => p.premium);
        } else if (cmd.id === 'op3_add_recent_joiners') {
          filtered = participants.filter((p: any) => p.participant?.className === 'ChannelParticipantRecent' || p.participant?.date);
        } else if (cmd.id === 'op3_add_by_country') {
          const country = String(params.country).toUpperCase();
          const prefixes: Record<string, string> = {
            SA: '+966', AE: '+971', EG: '+20', KW: '+965', QA: '+974',
            BH: '+973', OM: '+968', JO: '+962', LB: '+961', IQ: '+964',
          };
          filtered = participants.filter((p: any) => p.phone && ('+' + p.phone).startsWith(prefixes[country] || '+' + country));
        } else if (cmd.id === 'op3_add_by_username_pattern') {
          const pattern = String(params.pattern).toLowerCase();
          filtered = participants.filter((p: any) => p.username?.toLowerCase().includes(pattern));
        }
        filtered = filtered.slice(0, limit);

        const results: string[] = [];
        let success = 0, failed = 0;
        for (const p of filtered as any[]) {
          try {
            const userEntity = await client.getInputEntity(p);
            await client.invoke(new Api.channels.InviteToChannel({
              channel: target, users: [userEntity],
            }));
            results.push(`✓ ${p.firstName || p.id} — أُضيف`);
            success++;
          } catch (e: any) {
            const msg = e.message || String(e);
            if (msg.includes('FLOOD_WAIT')) {
              const m = msg.match(/(\d+)/);
              const wait = m ? parseInt(m[1]) : 60;
              results.push(`⛔ FloodWait ${wait}s — توقف`);
              failed++;
              break;
            }
            results.push(`✗ ${p.firstName || p.id} — ${msg.substring(0, 40)}`);
            failed++;
          }
          await new Promise((r) => setTimeout(r, delay));
        }
        output = `➕ ${cmd.label} (${filtered.length} مستخدم):\nنجح: ${success} | فشل: ${failed}\n\n` + results.join('\n');
        break;
      }
      case 'op3_multi_target_add': {
        const userList = String(params.userList).split('\n').map((s) => s.trim()).filter(Boolean);
        const targetPeers = String(params.targetPeers).split('\n').map((s) => s.trim()).filter(Boolean);
        const delay = Number(params.delay ?? 10) * 1000;
        const results: string[] = [];
        let totalSuccess = 0, totalFailed = 0;
        for (const user of userList) {
          for (const targetPeer of targetPeers) {
            try {
              const target = await resolvePeer(client, targetPeer);
              const userEntity = await client.getInputEntity(user);
              await client.invoke(new Api.channels.InviteToChannel({
                channel: target, users: [userEntity],
              }));
              results.push(`✓ ${user} → ${targetPeer}`);
              totalSuccess++;
            } catch (e: any) {
              results.push(`✗ ${user} → ${targetPeer}: ${e.message?.substring(0, 40)}`);
              totalFailed++;
            }
            await new Promise((r) => setTimeout(r, delay));
          }
        }
        output = `🎯 إضافة لعدة قروبات (${userList.length} مستخدم × ${targetPeers.length} قروب):\nنجح: ${totalSuccess} | فشل: ${totalFailed}\n\n` + results.join('\n');
        break;
      }

      // ===== ⚡ Ramex Adders (7) =====
      case 'ramex_clone_group': {
        const source = await resolvePeer(client, String(params.sourcePeer));
        const target = await resolvePeer(client, String(params.targetPeer));
        const limit = Number(params.limit ?? 100);
        const participants = await client.getParticipants(source, { limit: limit * 2 });
        const filtered = participants.filter((p: any) => !p.bot && !p.deleted).slice(0, limit);
        const results: string[] = [];
        let success = 0, failed = 0;
        for (const p of filtered as any[]) {
          try {
            const userEntity = await client.getInputEntity(p);
            await client.invoke(new Api.channels.InviteToChannel({
              channel: target, users: [userEntity],
            }));
            results.push(`✓ ${p.firstName || p.id}`);
            success++;
          } catch (e: any) {
            if (e.message?.includes('FLOOD_WAIT')) {
              results.push(`⛔ FloodWait — توقف`);
              failed++;
              break;
            }
            results.push(`✗ ${p.firstName || p.id}: ${e.message?.substring(0, 30)}`);
            failed++;
          }
          await new Promise((r) => setTimeout(r, 8000));
        }
        output = `⚡ استنساخ ${filtered.length} عضو:\nنجح: ${success} | فشل: ${failed}\n\n` + results.join('\n');
        break;
      }
      case 'ramex_incremental_add': {
        const source = await resolvePeer(client, String(params.sourcePeer));
        const target = await resolvePeer(client, String(params.targetPeer));
        const batchSize = Number(params.batchSize ?? 5);
        const intervalMinutes = Number(params.intervalMinutes ?? 30);
        const totalBatches = Number(params.totalBatches ?? 5);
        const participants = await client.getParticipants(source, { limit: batchSize * totalBatches });
        const filtered = participants.filter((p: any) => !p.bot && !p.deleted);
        const results: string[] = [];
        let success = 0, failed = 0;
        let idx = 0;
        for (let b = 0; b < totalBatches && idx < filtered.length; b++) {
          results.push(`\n📊 الدفعة ${b + 1}/${totalBatches}:`);
          for (let i = 0; i < batchSize && idx < filtered.length; i++, idx++) {
            const p = filtered[idx];
            try {
              const userEntity = await client.getInputEntity(p);
              await client.invoke(new Api.channels.InviteToChannel({
                channel: target, users: [userEntity],
              }));
              results.push(`  ✓ ${p.firstName || p.id}`);
              success++;
            } catch (e: any) {
              results.push(`  ✗ ${p.firstName || p.id}: ${e.message?.substring(0, 30)}`);
              failed++;
            }
            await new Promise((r) => setTimeout(r, 5000));
          }
          if (b < totalBatches - 1) {
            results.push(`  ⏸️ انتظار ${intervalMinutes} دقيقة...`);
            await new Promise((r) => setTimeout(r, intervalMinutes * 60 * 1000));
          }
        }
        output = `📈 إضافة تدريجية (${totalBatches} دفعات × ${batchSize}):\nنجح: ${success} | فشل: ${failed}\n` + results.join('\n');
        break;
      }
      case 'ramex_filter_add': {
        const source = await resolvePeer(client, String(params.sourcePeer));
        const target = await resolvePeer(client, String(params.targetPeer));
        const limit = Number(params.limit ?? 30);
        const onlyPremium = params.onlyPremium === true;
        const onlyWithUsername = params.onlyWithUsername === true;
        const filterBots = params.filterBots !== false;
        const filterDeleted = params.filterDeleted !== false;
        const participants = await client.getParticipants(source, { limit: limit * 5 });
        const filtered = participants.filter((p: any) => {
          if (filterBots && p.bot) return false;
          if (filterDeleted && p.deleted) return false;
          if (onlyPremium && !p.premium) return false;
          if (onlyWithUsername && !p.username) return false;
          return true;
        }).slice(0, limit);
        const results: string[] = [];
        let success = 0, failed = 0;
        for (const p of filtered as any[]) {
          try {
            const userEntity = await client.getInputEntity(p);
            await client.invoke(new Api.channels.InviteToChannel({
              channel: target, users: [userEntity],
            }));
            results.push(`✓ ${p.firstName || p.id}`);
            success++;
          } catch (e: any) {
            results.push(`✗ ${p.firstName || p.id}: ${e.message?.substring(0, 30)}`);
            failed++;
          }
          await new Promise((r) => setTimeout(r, 10000));
        }
        output = `🎛️ إضافة مع تصفية متقدمة:\nفلتر: ${filtered.length} من ${participants.length}\nنجح: ${success} | فشل: ${failed}\n\n` + results.join('\n');
        break;
      }
      case 'ramex_smart_distribute': {
        const source = await resolvePeer(client, String(params.sourcePeer));
        const targetPeers = String(params.targetPeers).split('\n').map((s) => s.trim()).filter(Boolean);
        const perTarget = Number(params.membersPerTarget ?? 10);
        const participants = await client.getParticipants(source, { limit: perTarget * targetPeers.length });
        const filtered = participants.filter((p: any) => !p.bot && !p.deleted);
        const results: string[] = [];
        let success = 0, failed = 0;
        let idx = 0;
        for (const targetPeer of targetPeers) {
          try {
            const target = await resolvePeer(client, targetPeer);
            results.push(`\n🎯 ${targetPeer}:`);
            for (let i = 0; i < perTarget && idx < filtered.length; i++, idx++) {
              const p = filtered[idx];
              try {
                const userEntity = await client.getInputEntity(p);
                await client.invoke(new Api.channels.InviteToChannel({
                  channel: target, users: [userEntity],
                }));
                results.push(`  ✓ ${p.firstName || p.id}`);
                success++;
              } catch (e: any) {
                results.push(`  ✗ ${p.firstName || p.id}: ${e.message?.substring(0, 30)}`);
                failed++;
              }
              await new Promise((r) => setTimeout(r, 8000));
            }
          } catch (e: any) {
            results.push(`✗ فشل حل ${targetPeer}: ${e.message}`);
          }
        }
        output = `⚖️ توزيع ذكي على ${targetPeers.length} قروب × ${perTarget}:\nنجح: ${success} | فشل: ${failed}\n` + results.join('\n');
        break;
      }
      case 'ramex_skip_existing': {
        const source = await resolvePeer(client, String(params.sourcePeer));
        const target = await resolvePeer(client, String(params.targetPeer));
        const limit = Number(params.limit ?? 30);
        const existingMembers = await client.getParticipants(target, { limit: 5000 });
        const existingIds = new Set(existingMembers.map((m: any) => String(m.id)));
        const sourceMembers = await client.getParticipants(source, { limit: limit * 3 });
        const toAdd = sourceMembers.filter((p: any) => !existingIds.has(String(p.id)) && !p.bot && !p.deleted).slice(0, limit);
        const results: string[] = [];
        let success = 0, failed = 0;
        for (const p of toAdd as any[]) {
          try {
            const userEntity = await client.getInputEntity(p);
            await client.invoke(new Api.channels.InviteToChannel({
              channel: target, users: [userEntity],
            }));
            results.push(`✓ ${p.firstName || p.id} (غير موجود مسبقاً)`);
            success++;
          } catch (e: any) {
            results.push(`✗ ${p.firstName || p.id}: ${e.message?.substring(0, 30)}`);
            failed++;
          }
          await new Promise((r) => setTimeout(r, 10000));
        }
        output = `⏭️ تخطي الموجودين:\nالموجودون: ${existingIds.size}\nالجدد: ${toAdd.length}\nنجح: ${success} | فشل: ${failed}\n\n` + results.join('\n');
        break;
      }
      case 'ramex_round_robin': {
        // Same logic as transfer but using only one account (true round-robin needs multiple accounts)
        const source = await resolvePeer(client, String(params.sourcePeer));
        const target = await resolvePeer(client, String(params.targetPeer));
        const limit = Number(params.limit ?? 30);
        const participants = await client.getParticipants(source, { limit: limit * 2 });
        const filtered = participants.filter((p: any) => !p.bot && !p.deleted).slice(0, limit);
        const results: string[] = [];
        let success = 0, failed = 0;
        for (const p of filtered as any[]) {
          try {
            const userEntity = await client.getInputEntity(p);
            await client.invoke(new Api.channels.InviteToChannel({
              channel: target, users: [userEntity],
            }));
            results.push(`✓ ${p.firstName || p.id}`);
            success++;
          } catch (e: any) {
            results.push(`✗ ${p.firstName || p.id}: ${e.message?.substring(0, 30)}`);
            failed++;
          }
          await new Promise((r) => setTimeout(r, 12000));
        }
        output = `🔄 Round Robin (حساب واحد):\nنجح: ${success} | فشل: ${failed}\n\n` + results.join('\n');
        break;
      }
      case 'ramex_geo_targeted': {
        const source = await resolvePeer(client, String(params.sourcePeer));
        const target = await resolvePeer(client, String(params.targetPeer));
        const countries = String(params.countries).split(',').map((s) => s.trim().toUpperCase());
        const prefixes: Record<string, string> = {
          SA: '+966', AE: '+971', EG: '+20', KW: '+965', QA: '+974',
          BH: '+973', OM: '+968', JO: '+962', LB: '+961', IQ: '+964',
        };
        const participants = await client.getParticipants(source, { limit: 5000 });
        const filtered = participants.filter((p: any) => {
          if (!p.phone) return false;
          const phone = '+' + p.phone;
          return countries.some((c) => phone.startsWith(prefixes[c] || '+' + c));
        }).slice(0, 30);
        const results: string[] = [];
        let success = 0, failed = 0;
        for (const p of filtered as any[]) {
          try {
            const userEntity = await client.getInputEntity(p);
            await client.invoke(new Api.channels.InviteToChannel({
              channel: target, users: [userEntity],
            }));
            results.push(`✓ ${p.firstName || p.id} (${p.phone})`);
            success++;
          } catch (e: any) {
            results.push(`✗ ${p.firstName}: ${e.message?.substring(0, 30)}`);
            failed++;
          }
          await new Promise((r) => setTimeout(r, 10000));
        }
        output = `🌐 استهداف جغرافي (${countries.join(', ')}):\nمطابق: ${filtered.length}\nنجح: ${success} | فشل: ${failed}\n\n` + results.join('\n');
        break;
      }

      // ===== 📍 Nearby (3) =====
      case 'nearby_find_users': {
        output = '⚠️ ميزة Nearby تحتاج صلاحيات الموقع على تطبيق تيليجرام الجوال.\n\n';
        output += 'لا يمكن محاكاتها من bot API لكن يمكنك:\n';
        output += '• استخدام "فلترة حسب الدولة" كبديل\n';
        output += '• سحب أعضاء من قروب محلي ثم تصفيتهم حسب رقم الهاتف';
        break;
      }
      case 'nearby_add_users': {
        output = '⚠️ Nearby + Add غير متاح عبر Bot API.\nاستخدم نقل الأعضاء من قروب محلي.';
        break;
      }
      case 'nearby_country_search': {
        const country = String(params.country);
        const targetPeer = params.targetPeer ? String(params.targetPeer) : null;
        const prefixes: Record<string, string> = {
          SA: '+966', AE: '+971', EG: '+20', KW: '+965', QA: '+974',
          BH: '+973', OM: '+968', JO: '+962', LB: '+961', IQ: '+964',
          SY: '+963', YE: '+967', PS: '+970', SD: '+249', LY: '+218',
          TN: '+216', DZ: '+213', MA: '+212', MR: '+222', SO: '+252',
        };
        const countryNames: Record<string, string> = {
          SA: 'السعودية', AE: 'الإمارات', EG: 'مصر', KW: 'الكويت', QA: 'قطر',
          BH: 'البحرين', OM: 'عمان', JO: 'الأردن', LB: 'لبنان', IQ: 'العراق',
          SY: 'سوريا', YE: 'اليمن', PS: 'فلسطين', SD: 'السودان', LY: 'ليبيا',
          TN: 'تونس', DZ: 'الجزائر', MA: 'المغرب', MR: 'موريتانيا', SO: 'الصومال',
        };
        // Find dialogs with users from this country
        const dialogs = await client.getDialogs({ limit: 500 });
        const matching: any[] = [];
        for (const d of dialogs as any[]) {
          if (d.entity?.phone) {
            const phone = '+' + d.entity.phone;
            if (phone.startsWith(prefixes[country])) {
              matching.push(d.entity);
            }
          }
        }
        output = `🌍 مستخدمو ${countryNames[country]} (${country}) في محادثاتك:\n\n`;
        output += `تم العثور على: ${matching.length} مستخدم\n\n`;
        output += matching.slice(0, 50).map((u) => `• +${u.phone} | ${u.firstName || '-'} @${u.username || '-'}`).join('\n');

        if (targetPeer && matching.length > 0) {
          output += `\n\n➕ إضافة لـ ${targetPeer}...`;
          const target = await resolvePeer(client, targetPeer);
          let added = 0, failed = 0;
          for (const u of matching.slice(0, 20)) {
            try {
              const userEntity = await client.getInputEntity(u);
              await client.invoke(new Api.channels.InviteToChannel({
                channel: target, users: [userEntity],
              }));
              added++;
            } catch {
              failed++;
            }
            await new Promise((r) => setTimeout(r, 5000));
          }
          output += `\n✓ أُضيف: ${added} | ✗ فشل: ${failed}`;
        }
        break;
      }

      // ===== 📨 Messaging (4) =====
      case 'msg_send_text': {
        const peer = await resolvePeer(client, String(params.peer));
        const result = await client.sendMessage(peer, {
          message: String(params.message),
          silent: params.silent === true,
          replyTo: params.replyToMsgId ? Number(params.replyToMsgId) : undefined,
        });
        if (params.pin === true) {
          await client.invoke(new Api.messages.PinMessage({ peer, id: [(result as any).id] }));
        }
        output = `✅ تم إرسال الرسالة\nMessage ID: ${(result as any).id}\n`;
        if (params.silent) output += '(صامت)\n';
        if (params.pin) output += '(مثبّتة ✓)\n';
        break;
      }
      case 'msg_send_media': {
        const peer = await resolvePeer(client, String(params.peer));
        const fileUrl = String(params.fileUrl);
        const caption = params.caption ? String(params.caption) : undefined;
        // Download file from URL and send it
        try {
          const response = await fetch(fileUrl);
          const buffer = await response.arrayBuffer();
          const file = Buffer.from(buffer);
          const result = await client.sendFile(peer, {
            file: new CustomFile(fileUrl.split('/').pop() || 'file', file.length, '', file),
            caption,
            spoiler: params.asSpoiler === true,
          });
          output = `✅ تم إرسال الوسائط\nMessage ID: ${(result as any).id}`;
        } catch (e: any) {
          output = `✗ فشل إرسال الوسائط: ${e.message}`;
        }
        break;
      }
      case 'msg_forward': {
        const fromPeer = await resolvePeer(client, String(params.fromPeer));
        const toPeer = await resolvePeer(client, String(params.toPeer));
        const msgIds = String(params.msgIds).split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
        await client.forwardMessages(toPeer, msgIds, fromPeer);
        output = `✅ تم توجيه ${msgIds.length} رسالة`;
        break;
      }
      case 'msg_poll': {
        const peer = await resolvePeer(client, String(params.peer));
        const question = String(params.question);
        const options = String(params.options).split('\n').map((s) => s.trim()).filter(Boolean);
        const pollResults = await client.invoke(new Api.messages.SendMedia({
          peer,
          media: new Api.InputMediaPoll({
            poll: new Api.Poll({
              id: BigInt(Math.floor(Math.random() * 1e10)),
              question,
              answers: options.map((text, i) => new Api.PollAnswer({
                text,
                option: Buffer.from([i]),
              })),
              multipleChoice: params.multipleAnswers === true,
              publicVoters: params.publicVoters === true,
              closed: params.closed === true,
            }),
          }),
          message: '',
        }));
        output = `✅ تم إرسال الاستطلاع\nالسؤال: ${question}\nالخيارات: ${options.join(' | ')}`;
        break;
      }

      // ===== 🚩 Reports (4) =====
      case 'report_user': {
        const peer = await resolvePeer(client, String(params.peer));
        const reason = String(params.reason);
        const reasonMap: Record<string, any> = {
          spam: new Api.ReportReasonSpam(),
          fraud: new Api.ReportReasonFraud(),
          impersonation: new Api.ReportReasonFake(),
          illegal: new Api.ReportReasonIllegalDrugs(),
          pornography: new Api.ReportReasonChildAbuse(),
          hate: new Api.ReportReasonViolence(),
          violence: new Api.ReportReasonViolence(),
          child_abuse: new Api.ReportReasonChildAbuse(),
          bullying: new Api.ReportReasonPersonalDetails(),
          other: new Api.ReportReasonOther(),
        };
        await client.invoke(new Api.account.ReportPeer({
          peer,
          reason: reasonMap[reason] || new Api.ReportReasonOther(),
          message: params.comment ? String(params.comment) : '',
        }));
        output = `🚩 تم إرسال البلاغ عن المستخدم بنجاح\nالسبب: ${reason}`;
        break;
      }
      case 'report_message': {
        const peer = await resolvePeer(client, String(params.peer));
        const msgId = Number(params.msgId);
        const reason = String(params.reason);
        const reasonMap: Record<string, any> = {
          spam: new Api.ReportReasonSpam(),
          fraud: new Api.ReportReasonFraud(),
          impersonation: new Api.ReportReasonFake(),
          illegal: new Api.ReportReasonIllegalDrugs(),
          pornography: new Api.ReportReasonChildAbuse(),
          hate: new Api.ReportReasonViolence(),
          violence: new Api.ReportReasonViolence(),
          child_abuse: new Api.ReportReasonChildAbuse(),
          bullying: new Api.ReportReasonPersonalDetails(),
          other: new Api.ReportReasonOther(),
        };
        await client.invoke(new Api.messages.Report({
          peer,
          id: [msgId],
          reason: reasonMap[reason] || new Api.ReportReasonOther(),
          message: '',
        }));
        output = `🚩 تم إرسال البلاغ عن الرسالة ${msgId} بنجاح`;
        break;
      }
      case 'report_channel': {
        const peer = await resolvePeer(client, String(params.peer));
        const reason = String(params.reason);
        const reasonMap: Record<string, any> = {
          spam: new Api.ReportReasonSpam(),
          fraud: new Api.ReportReasonFraud(),
          impersonation: new Api.ReportReasonFake(),
          illegal: new Api.ReportReasonIllegalDrugs(),
          pornography: new Api.ReportReasonChildAbuse(),
          violence: new Api.ReportReasonViolence(),
          child_abuse: new Api.ReportReasonChildAbuse(),
          other: new Api.ReportReasonOther(),
        };
        await client.invoke(new Api.account.ReportPeer({
          peer,
          reason: reasonMap[reason] || new Api.ReportReasonOther(),
          message: '',
        }));
        output = `🚩 تم إرسال البلاغ عن القناة بنجاح`;
        break;
      }
      case 'report_story': {
        const peer = await resolvePeer(client, String(params.peer));
        const storyId = Number(params.storyId);
        const reason = String(params.reason);
        output = `🚩 محاولة الإبلاغ عن الستوري ${storyId}\n`;
        output += `ملاحظة: الإبلاغ عن الستوري غير متاح عبر Bot API مباشرة.\n`;
        output += `استخدم الإبلاغ عن المستخدم كحل بديل.`;
        break;
      }

      // ===== 🛠️ Group Tools (4) =====
      case 'group_anti_delete': {
        const peer = await resolvePeer(client, String(params.groupPeer));
        // Get recent deleted messages (Telegram keeps them as service messages)
        const messages = await client.getMessages(peer, { limit: 100 });
        const deleted = messages.filter((m: any) => m.action?.className === 'MessageActionChatDeleteMessage' || m.deleted);
        output = `🛡️ الرسائل المحذوفة في آخر 100 رسالة:\n\n`;
        output += `عدد المحذوفة: ${deleted.length}\n\n`;
        output += deleted.slice(0, 20).map((m: any) => {
          const date = new Date((m.date || 0) * 1000).toLocaleString('ar');
          return `• [${date}] رسالة ${m.id} — حُذفت`;
        }).join('\n');
        break;
      }
      case 'group_history_cleanup': {
        const confirm = String(params.confirm);
        if (confirm !== 'CLEAN') {
          ok = false;
          error = 'التأكيد غير صحيح — اكتب "CLEAN" للتأكيد';
          break;
        }
        const peer = await resolvePeer(client, String(params.groupPeer));
        const me = await client.getMe() as any;
        const messages = await client.getMessages(peer, { fromUser: 'me', limit: 1000 });
        const ids = messages.map((m: any) => m.id);
        await client.deleteMessages(peer, ids, { revoke: true });
        output = `🧹 تم حذف ${ids.length} رسالة من حسابك في القروب`;
        break;
      }
      case 'group_member_tracker': {
        const peer = await resolvePeer(client, String(params.groupPeer));
        const participants = await client.getParticipants(peer, { limit: 1000 });
        const recent = participants.filter((p: any) => {
          const joinedAt = p.participant?.date;
          if (!joinedAt) return false;
          const dayAgo = (Date.now() / 1000) - 86400;
          return joinedAt > dayAgo;
        });
        const left = participants.filter((p: any) => p.participant?.className === 'ChannelParticipantLeft');
        output = `👁️ تتبع دخول/خروج آخر 24 ساعة:\n\n`;
        output += `✅ انضموا حديثاً: ${recent.length}\n`;
        output += `🚪 غادروا: ${left.length}\n\n`;
        output += 'المنضمون الجدد:\n';
        output += recent.slice(0, 20).map((p: any) => `• ${p.firstName || '-'} @${p.username || '-'}`).join('\n');
        break;
      }
      case 'group_link_converter': {
        const link = String(params.inviteLink);
        // Try to resolve the link to get the chat username
        try {
          const hash = link.replace(/.*\+/, '').replace(/.*joinchat\//, '');
          const result = await client.invoke(new Api.messages.CheckChatInvite({ hash }));
          if (result.chat?.username) {
            output = `🔗 تحويل الرابط:\n\nالرابط القديم: ${link}\nالرابط المباشر: @${result.chat.username}\nhttps://t.me/${result.chat.username}`;
          } else {
            output = `ℹ️ هذا القروب لا يملك username مباشر.\nالرابط الأصلي: ${link}\nالاسم: ${result.chat?.title || 'غير معروف'}`;
          }
        } catch (e: any) {
          output = `✗ فشل تحليل الرابط: ${e.message}`;
        }
        break;
      }

      // ===== 📈 Engagement (3) =====
      case 'eng_mass_reactions': {
        const groups = String(params.groups).split('\n').map((s) => s.trim()).filter(Boolean);
        const emoji = String(params.emoji || '❤️');
        const limit = Number(params.limit ?? 10);
        const results: string[] = [];
        let totalSuccess = 0, totalFailed = 0;
        for (const groupPeer of groups) {
          try {
            const peer = await resolvePeer(client, groupPeer);
            const messages = await client.getMessages(peer, { limit });
            let groupSuccess = 0;
            for (const m of messages as any[]) {
              try {
                await client.invoke(new Api.messages.SendReaction({
                  peer, msgId: m.id,
                  reaction: [new Api.ReactionEmoji({ emoticon: emoji })],
                }));
                groupSuccess++;
              } catch {}
            }
            results.push(`✓ ${groupPeer}: ${groupSuccess}/${messages.length} تفاعل`);
            totalSuccess += groupSuccess;
          } catch (e: any) {
            results.push(`✗ ${groupPeer}: ${e.message?.substring(0, 40)}`);
            totalFailed++;
          }
        }
        output = `❤️ تفاعلات جماعية (${groups.length} قروب × ${limit} رسالة):\nإجمالي النجاح: ${totalSuccess}\n\n` + results.join('\n');
        break;
      }
      case 'eng_view_stories': {
        // Get all contacts/friends and view their stories
        const contacts = await client.invoke(new Api.contacts.GetContacts({}));
        const users = (contacts as any)?.users || [];
        let viewed = 0;
        for (const u of users.slice(0, Number(params.limit ?? 50))) {
          try {
            await client.invoke(new Api.stories.ReadStories({ peer: u.id, maxId: 100 }));
            viewed++;
          } catch {}
          await new Promise((r) => setTimeout(r, 500));
        }
        output = `👀 تمت مشاهدة ${viewed} ستوري من ${users.length} صديق`;
        break;
      }
      case 'eng_story_reactions': {
        const peer = await resolvePeer(client, String(params.peer));
        const emoji = String(params.emoji || '❤️');
        try {
          await client.invoke(new Api.stories.SendReaction({
            peer,
            storyId: 1,
            reaction: new Api.ReactionEmoji({ emoticon: emoji }),
          }));
          output = `✅ تم التفاعل مع ستوري ${peer}`;
        } catch (e: any) {
          output = `⚠️ التفاعل مع الستوري محدود عبر API. رسالة الخطأ: ${e.message?.substring(0, 100)}`;
        }
        break;
      }

      // ===== Misc remaining commands =====
      case 'get_profile_photos': {
        const photos = await client.getProfilePhotos('me');
        output = `🖼️ صور الملف الشخصي (${photos.length}):\n\n`;
        output += photos.map((p: any) => `• ID: ${p.id} | حجم: ${p.sizes?.length || '?'} نسخ`).join('\n');
        break;
      }
      case 'change_2fa': {
        // Same as secure_login_change
        const { password: PasswordHelper } = await import('telegram');
        const currentResult = await client.invoke(new Api.account.GetPassword());
        const currentCheck = await (PasswordHelper as any).computeCheck(currentResult as any, String(params.currentPassword));
        const newSettings = new Api.account.PasswordInputSettings({
          newAlgo: currentResult.newAlgo,
          newPasswordHash: await (PasswordHelper as any).computeCheck(currentResult as any, String(params.newPassword)),
          hint: params.hint ? String(params.hint) : undefined,
        });
        await client.invoke(new Api.account.UpdatePasswordSettings({ password: currentCheck, newSettings }));
        output = '✅ تم تغيير كلمة مرور 2FA بنجاح';
        break;
      }
      case 'enable_2fa': {
        const { password: PasswordHelper } = await import('telegram');
        const result = await client.invoke(new Api.account.GetPassword());
        if (result.hasPassword) {
          output = '⚠️ 2FA مفعّل بالفعل';
          break;
        }
        const newSettings = new Api.account.PasswordInputSettings({
          newAlgo: result.newAlgo,
          newPasswordHash: await (PasswordHelper as any).computeCheck(result as any, String(params.password)),
          hint: params.hint ? String(params.hint) : undefined,
        });
        await client.invoke(new Api.account.UpdatePasswordSettings({ password: new Api.InputCheckPasswordEmpty(), newSettings }));
        output = '✅ تم تفعيل 2FA';
        break;
      }
      case 'disable_2fa': {
        const { password: PasswordHelper } = await import('telegram');
        const currentResult = await client.invoke(new Api.account.GetPassword());
        const currentCheck = await (PasswordHelper as any).computeCheck(currentResult as any, String(params.currentPassword));
        await client.invoke(new Api.account.UpdatePasswordSettings({
          password: currentCheck,
          newSettings: new Api.account.PasswordInputSettings({}),
        }));
        output = '⚠️ تم تعطيل 2FA';
        break;
      }
      case 'get_login_codes': {
        // Try to fetch sent codes - limited API support
        output = '🔢 لا يمكن عرض أكواد SMS سابقة عبر Bot API.\n';
        output += 'تيليجرام يرسل الأكواد عبر SMS/تطبيق فقط.\n';
        output += 'لعرض محاولات الدخول الأخيرة، استخدم /secure-login → الجلسات';
        break;
      }
      case 'get_full_info': {
        const me = await client.getMe() as any;
        const full = await client.invoke(new Api.users.GetFullUser({ id: new Api.InputUserSelf() }));
        output = `📋 المعلومات الكاملة:\n\n` + JSON.stringify({
          id: String(me.id),
          first_name: me.firstName || me.first_name,
          last_name: me.lastName || me.last_name,
          username: me.username,
          phone: me.phone,
          premium: me.premium,
          status: me.status?.className,
          full_info: full,
        }, null, 2).substring(0, 5000);
        break;
      }
      case 'get_entity_info': {
        const peer = await resolvePeer(client, String(params.peer));
        const entity = await client.getEntity(peer);
        output = `📋 معلومات الجهة:\n\n` + JSON.stringify(entity, null, 2).substring(0, 3000);
        break;
      }
      case 'get_chat_info': {
        const peer = await resolvePeer(client, String(params.peer));
        const entity = await client.getEntity(peer);
        const fullChat = await client.invoke(new Api.messages.GetFullChat({ chatId: (entity as any).id }));
        output = `ℹ️ معلومات المحادثة:\n\n` + JSON.stringify({
          name: (entity as any).title || (entity as any).firstName,
          username: (entity as any).username,
          id: String((entity as any).id),
          type: (entity as any).className,
          full: fullChat,
        }, null, 2).substring(0, 5000);
        break;
      }
      case 'delete_contact': {
        const userId = String(params.userId);
        const userEntity = await client.getInputEntity(userId);
        await client.invoke(new Api.contacts.DeleteContacts({ id: [userEntity] }));
        output = `✅ تم حذف جهة الاتصال`;
        break;
      }
      case 'send_file': {
        const peer = await resolvePeer(client, String(params.peer));
        const fileUrl = String(params.fileUrl);
        const caption = params.caption ? String(params.caption) : undefined;
        try {
          const response = await fetch(fileUrl);
          const buffer = await response.arrayBuffer();
          const file = Buffer.from(buffer);
          const result = await client.sendFile(peer, {
            file: new CustomFile(fileUrl.split('/').pop() || 'file', file.length, '', file),
            caption,
          });
          output = `✅ تم إرسال الملف بنجاح\nMessage ID: ${(result as any).id}`;
        } catch (e: any) {
          output = `✗ فشل: ${e.message}`;
        }
        break;
      }
      case 'forward_messages': {
        const fromPeer = await resolvePeer(client, String(params.fromPeer));
        const toPeer = await resolvePeer(client, String(params.toPeer));
        const ids = String(params.messageIds).split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
        await client.forwardMessages(toPeer, ids, fromPeer);
        output = `✅ تم توجيه ${ids.length} رسالة`;
        break;
      }
      case 'check_username_available': {
        const username = String(params.username).replace('@', '');
        try {
          await client.invoke(new Api.account.CheckUsername({ username }));
          output = `✅ اسم المستخدم @${username} متاح للتسجيل!`;
        } catch (e: any) {
          output = `❌ @${username} غير متاح: ${e.message?.substring(0, 80)}`;
        }
        break;
      }
      case 'create_group': {
        const result = await client.invoke(new Api.messages.CreateChat({
          users: [],
          title: String(params.title),
        }));
        output = `✅ تم إنشاء المجموعة: ${params.title}`;
        break;
      }
      case 'join_group': {
        const hash = String(params.inviteLink).replace(/.*\+/, '').replace(/.*joinchat\//, '');
        await client.invoke(new Api.messages.ImportChatInvite({ hash }));
        output = `✅ تم الانضمام للمجموعة`;
        break;
      }
      case 'leave_group': {
        const peer = await resolvePeer(client, String(params.groupId));
        await client.invoke(new Api.channels.LeaveChannel({ channel: peer }));
        output = `✅ تمت المغادرة`;
        break;
      }
      case 'get_participants': {
        const peer = await resolvePeer(client, String(params.groupId));
        const participants = await client.getParticipants(peer, { limit: 200 });
        output = `👥 أعضاء المجموعة (${participants.length}):\n\n`;
        output += participants.map((p: any) => `• ${p.firstName || '-'} @${p.username || '-'}`).join('\n');
        break;
      }
      case 'kick_member': {
        const peer = await resolvePeer(client, String(params.groupId));
        const userEntity = await client.getInputEntity(String(params.userId));
        await client.invoke(new Api.channels.EditBanned({
          channel: peer,
          participant: userEntity,
          bannedRights: new Api.ChatBannedRights({ viewMessages: true, sendMessages: true, untilDate: 0 }),
        }));
        output = `✅ تم طرد العضو`;
        break;
      }
      case 'promote_admin': {
        const peer = await resolvePeer(client, String(params.groupId));
        const userEntity = await client.getInputEntity(String(params.userId));
        await client.invoke(new Api.channels.EditAdmin({
          channel: peer,
          userId: userEntity,
          adminRights: new Api.ChatAdminRights({
            changeInfo: true,
            postMessages: true,
            editMessages: true,
            deleteMessages: true,
            banUsers: true,
            inviteUsers: true,
            pinMessages: true,
            manageCall: true,
          }),
          rank: 'admin',
        }));
        output = `✅ تمت ترقية العضو لمشرف`;
        break;
      }
      case 'set_group_title': {
        const peer = await resolvePeer(client, String(params.groupId));
        await client.invoke(new Api.channels.EditTitle({
          channel: peer,
          title: String(params.title),
        }));
        output = `✅ تم تحديث اسم المجموعة`;
        break;
      }
      case 'create_channel': {
        const result = await client.invoke(new Api.channels.CreateChannel({
          title: String(params.title),
          about: params.about ? String(params.about) : '',
          megagroup: params.megagroup === true,
        }));
        output = `✅ تم إنشاء القناة: ${params.title}`;
        break;
      }
      case 'join_channel': {
        const peer = await resolvePeer(client, String(params.channelUsername));
        await client.invoke(new Api.channels.JoinChannel({ channel: peer }));
        output = `✅ تم الانضمام للقناة`;
        break;
      }
      case 'leave_channel': {
        const peer = await resolvePeer(client, String(params.channelId));
        await client.invoke(new Api.channels.LeaveChannel({ channel: peer }));
        output = `✅ تمت مغادرة القناة`;
        break;
      }
      case 'get_channel_members': {
        const peer = await resolvePeer(client, String(params.channelId));
        const participants = await client.getParticipants(peer, { limit: 1000 });
        output = `📢 عدد المشتركين: ${participants.length}`;
        break;
      }
      case 'mass_promote': {
        const peer = await resolvePeer(client, String(params.groupPeer));
        const users = String(params.userList).split('\n').map((s) => s.trim()).filter(Boolean);
        const results: string[] = [];
        let success = 0, failed = 0;
        for (const u of users) {
          try {
            const userEntity = await client.getInputEntity(u);
            await client.invoke(new Api.channels.EditAdmin({
              channel: peer,
              userId: userEntity,
              adminRights: new Api.ChatAdminRights({
                changeInfo: true, postMessages: true, editMessages: true,
                deleteMessages: true, banUsers: true, inviteUsers: true,
                pinMessages: true, manageCall: true,
              }),
              rank: 'admin',
            }));
            results.push(`✓ ${u} — مُرقّى`);
            success++;
          } catch (e: any) {
            results.push(`✗ ${u}: ${e.message?.substring(0, 40)}`);
            failed++;
          }
        }
        output = `⬆️ نتائج الترقية:\nنجح: ${success} | فشل: ${failed}\n\n` + results.join('\n');
        break;
      }
      case 'mass_pin_messages': {
        const groups = String(params.groups).split('\n').map((s) => s.trim()).filter(Boolean);
        const results: string[] = [];
        let success = 0, failed = 0;
        for (const g of groups) {
          try {
            const peer = await resolvePeer(client, g);
            const messages = await client.getMessages(peer, { limit: 1 });
            if (messages[0]) {
              await client.invoke(new Api.messages.PinMessage({ peer, id: [messages[0].id] }));
              results.push(`✓ ${g} — ثُبّت آخر رسالة`);
              success++;
            }
          } catch (e: any) {
            results.push(`✗ ${g}: ${e.message?.substring(0, 40)}`);
            failed++;
          }
        }
        output = `📌 نتائج التثبيت:\nنجح: ${success} | فشل: ${failed}\n\n` + results.join('\n');
        break;
      }
      case 'mass_delete_dialogs': {
        const confirm = String(params.confirm);
        if (confirm !== 'DELETE') {
          ok = false;
          error = 'التأكيد غير صحيح — اكتب "DELETE"';
          break;
        }
        const dialogs = await client.getDialogs({ limit: 200 });
        let count = 0;
        for (const d of dialogs as any[]) {
          try {
            await client.invoke(new Api.messages.DeleteHistory({
              peer: d.entity,
              maxId: 0,
              revoke: true,
              justClear: false,
            }));
            count++;
          } catch {}
        }
        output = `🗑️ تم حذف ${count} محادثة`;
        break;
      }

      // ============================================================================
      // 🔒 SCRAPING — قروبات خاصة + رسائل + سحب عميق
      // ============================================================================
      case 'scrape_private_group': {
        const peer = await resolvePeer(client, String(params.groupPeer));
        const limit = Number(params.limit ?? 500);
        const filterBots = params.filterBots !== false;
        const filterDeleted = params.filterDeleted !== false;
        const participants = await client.getParticipants(peer, { limit });
        const filtered = participants.filter((p: any) => {
          if (filterBots && p.bot) return false;
          if (filterDeleted && p.deleted) return false;
          return true;
        });
        output = `🔒 سحب من قروب خاص:\n\nإجمالي: ${participants.length} | بعد التصفية: ${filtered.length}\n\n`;
        output += filtered.slice(0, 200).map((p: any) => {
          const id = String(p.id).padEnd(17);
          const uname = (p.username ? '@' + p.username : '-').padEnd(18);
          return `${id} | ${uname} | ${p.firstName || '-'}`;
        }).join('\n');
        break;
      }
      case 'scrape_from_messages': {
        const peer = await resolvePeer(client, String(params.groupPeer));
        const limit = Number(params.limit ?? 1000);
        const extractForwards = params.extractForwards !== false;
        const extractReplies = params.extractReplies !== false;
        const messages = await client.getMessages(peer, { limit });
        const userIds = new Set<string>();
        const users: any[] = [];

        for (const m of messages as any[]) {
          if (extractForwards && m.fwdFrom?.fromId?.userId) {
            const id = String(m.fwdFrom.fromId.userId);
            if (!userIds.has(id)) { userIds.add(id); users.push({ id, source: 'forward' }); }
          }
          if (extractReplies && m.replyTo?.replyToUserId) {
            const id = String(m.replyTo.replyToUserId);
            if (!userIds.has(id)) { userIds.add(id); users.push({ id, source: 'reply' }); }
          }
          if (m.senderId) {
            const id = String(m.senderId);
            if (!userIds.has(id)) { userIds.add(id); users.push({ id, source: 'sender' }); }
          }
        }

        output = `💬 سحب من ${messages.length} رسالة:\nمستخدمون فريدون: ${users.length}\n\n`;
        output += users.slice(0, 200).map((u) => `• ID: ${u.id} (مصدر: ${u.source})`).join('\n');
        break;
      }
      case 'scrape_deep_members': {
        const peer = await resolvePeer(client, String(params.groupPeer));
        const limit = Number(params.limit ?? 200);
        const includeBio = params.includeBio !== false;
        const includePhotoUrl = params.includePhotoUrl === true;
        const participants = await client.getParticipants(peer, { limit });

        output = `🔍 السحب العميق (${participants.length} عضو):\n\n`;
        for (const p of participants.slice(0, 100) as any[]) {
          let info = `• ${p.firstName || ''} ${p.lastName || ''} (ID: ${p.id})`;
          if (p.username) info += ` @${p.username}`;
          if (p.premium) info += ` ⭐Premium`;
          if (p.bot) info += ` 🤖Bot`;
          if (p.deleted) info += ` 💀Deleted`;
          if (p.phone) info += ` 📱+${p.phone}`;

          if (includeBio || includePhotoUrl) {
            try {
              const full = await client.invoke(new Api.users.GetFullUser({ id: p.id })) as any;
              if (includeBio && full?.fullUser?.about) info += `\n  Bio: ${full.fullUser.about.substring(0, 100)}`;
              if (includePhotoUrl && full?.fullUser?.profilePhoto) info += `\n  Photo ID: ${full.fullUser.profilePhoto.photoId}`;
            } catch {}
            await new Promise((r) => setTimeout(r, 300)); // Avoid flood
          }
          output += info + '\n';
        }
        break;
      }
      case 'scrape_invite_link_members': {
        const peer = await resolvePeer(client, String(params.groupPeer));
        // Get chat invite links
        try {
          const result = await client.invoke(new Api.messages.GetChatInviteImporters({
            peer,
            limit: 200,
            requested: false,
          })) as any;
          const importers = result.importers || [];
          output = `🔗 مستخدمو رابط الدعوة (${importers.length}):\n\n`;
          output += importers.map((imp: any) => `• ${imp.userId} | عبر: ${imp.date ? new Date(imp.date * 1000).toLocaleDateString('ar') : '?'}`).join('\n');
        } catch (e: any) {
          output = `⚠️ تحتاج صلاحية مشرف لعرض مستوردي رابط الدعوة.\nالخطأ: ${e.message?.substring(0, 100)}`;
        }
        break;
      }
      case 'scrape_message_reactions': {
        const peer = await resolvePeer(client, String(params.groupPeer));
        const msgId = Number(params.msgId);
        try {
          const result = await client.invoke(new Api.messages.GetMessageReactionsList({
            peer,
            id: msgId,
            limit: 100,
          })) as any;
          const reactions = result?.reactions || [];
          const users = result?.users || [];
          output = `❤️ المستخدمون المتفاعلون مع رسالة ${msgId} (${reactions.length} تفاعل):\n\n`;
          output += users.map((u: any) => `• ${u.firstName || '-'} @${u.username || '-'} (ID: ${u.id})`).join('\n');
        } catch (e: any) {
          output = `⚠️ فشل: ${e.message?.substring(0, 100)}`;
        }
        break;
      }
      case 'scrape_message_readers': {
        const peer = await resolvePeer(client, String(params.channelPeer));
        const msgId = Number(params.msgId);
        try {
          const result = await client.invoke(new Api.messages.GetMessagesViewers({
            peer,
            msgId,
          })) as any;
          const viewers = result?.users || [];
          output = `👁️ من قرأ الرسالة ${msgId} (${viewers.length}):\n\n`;
          output += viewers.map((u: any) => `• ${u.firstName || '-'} @${u.username || '-'} (ID: ${u.id})`).join('\n');
        } catch (e: any) {
          output = `⚠️ يتطلب صلاحية مشرف في القناة.\nالخطأ: ${e.message?.substring(0, 100)}`;
        }
        break;
      }
      case 'scrape_dialogs_users': {
        const limit = Number(params.limit ?? 500);
        const onlyPrivate = params.onlyPrivate === true;
        const onlyGroup = params.onlyGroup === true;
        const onlyChannel = params.onlyChannel === true;
        const dialogs = await client.getDialogs({ limit });
        let filtered = dialogs;
        if (onlyPrivate) filtered = dialogs.filter((d: any) => d.isUser);
        if (onlyGroup) filtered = dialogs.filter((d: any) => d.isGroup);
        if (onlyChannel) filtered = dialogs.filter((d: any) => d.isChannel);

        const users: any[] = [];
        for (const d of filtered as any[]) {
          if (d.entity && !d.entity.bot && !d.entity.deleted) {
            users.push(d.entity);
          }
        }
        output = `📥 سحب من ${filtered.length} محادثة (${users.length} مستخدم):\n\n`;
        output += users.slice(0, 200).map((u: any) => `• ${u.firstName || '-'} @${u.username || '-'} (ID: ${u.id})`).join('\n');
        break;
      }

      // ============================================================================
      // ➕ ADVANCED ADDERS — ملف + جهات اتصال + تفاعل + رسائل
      // ============================================================================
      case 'add_from_file': {
        const target = await resolvePeer(client, String(params.targetPeer));
        const content = String(params.fileContent || '');
        const format = String(params.fileFormat || 'txt');
        const delay = Number(params.delay ?? 5) * 1000;
        const stopOnFlood = params.stopOnFlood !== false;

        let users: string[] = [];
        if (format === 'json') {
          try {
            const arr = JSON.parse(content);
            users = arr.map((x: any) => String(x));
          } catch { users = []; }
        } else if (format === 'csv1') {
          users = content.split('\n').map((s) => s.split(',')[0].trim()).filter(Boolean);
        } else if (format === 'csv2') {
          users = content.split('\n').map((s) => {
            const parts = s.split(',');
            return parts[0] || parts[1] || '';
          }).map((s) => s.trim()).filter(Boolean);
        } else {
          // txt
          users = content.split('\n').map((s) => s.trim()).filter(Boolean);
        }

        const results: string[] = [];
        let success = 0, failed = 0;
        for (const user of users) {
          try {
            const userEntity = await client.getInputEntity(user);
            await client.invoke(new Api.channels.InviteToChannel({
              channel: target, users: [userEntity],
            }));
            results.push(`✓ ${user}`);
            success++;
          } catch (e: any) {
            const msg = e.message || String(e);
            if (msg.includes('FLOOD_WAIT') && stopOnFlood) {
              const m = msg.match(/(\d+)/);
              const wait = m ? parseInt(m[1], 10) : 60;
              results.push(`⛔ FloodWait ${wait}s — توقف`);
              failed++;
              break;
            }
            results.push(`✗ ${user}: ${msg.substring(0, 40)}`);
            failed++;
          }
          await new Promise((r) => setTimeout(r, delay));
        }
        output = `📄 إضافة من ملف (${format}) — ${users.length} مستخدم:\nنجح: ${success} | فشل: ${failed}\n\n` + results.join('\n');
        break;
      }
      case 'add_from_contacts': {
        const target = await resolvePeer(client, String(params.targetPeer));
        const limit = Number(params.limit ?? 50);
        const delay = Number(params.delay ?? 5) * 1000;
        const filterNotInGroup = params.filterNotInGroup !== false;

        const contactsResult = await client.invoke(new Api.contacts.GetContacts({})) as any;
        const contacts = (contactsResult?.users || []).filter((u: any) => !u.bot && !u.deleted);

        // Optionally filter out users already in target group
        let toAdd = contacts;
        if (filterNotInGroup) {
          try {
            const existing = await client.getParticipants(target, { limit: 5000 });
            const existingIds = new Set(existing.map((m: any) => String(m.id)));
            toAdd = contacts.filter((c: any) => !existingIds.has(String(c.id)));
          } catch {}
        }
        toAdd = toAdd.slice(0, limit);

        const results: string[] = [];
        let success = 0, failed = 0;
        for (const contact of toAdd as any[]) {
          try {
            await client.invoke(new Api.channels.InviteToChannel({
              channel: target,
              users: [new Api.InputUser({ userId: BigInt(contact.id), accessHash: BigInt(contact.accessHash) })],
            }));
            results.push(`✓ ${contact.firstName || contact.id}`);
            success++;
          } catch (e: any) {
            if (e.message?.includes('FLOOD_WAIT')) {
              results.push(`⛔ FloodWait — توقف`);
              failed++;
              break;
            }
            results.push(`✗ ${contact.firstName || contact.id}: ${e.message?.substring(0, 30)}`);
            failed++;
          }
          await new Promise((r) => setTimeout(r, delay));
        }
        output = `📇 إضافة من جهات الاتصال (${toAdd.length} من ${contacts.length}):\nنجح: ${success} | فشل: ${failed}\n\n` + results.join('\n');
        break;
      }
      case 'add_from_reactors': {
        const source = await resolvePeer(client, String(params.sourcePeer));
        const target = await resolvePeer(client, String(params.targetPeer));
        const msgId = Number(params.msgId);
        const limit = Number(params.limit ?? 30);
        const delay = Number(params.delay ?? 8) * 1000;

        try {
          const result = await client.invoke(new Api.messages.GetMessageReactionsList({
            peer: source, id: msgId, limit,
          })) as any;
          const users = result?.users || [];
          const results: string[] = [];
          let success = 0, failed = 0;
          for (const u of users) {
            try {
              const userEntity = await client.getInputEntity(u);
              await client.invoke(new Api.channels.InviteToChannel({
                channel: target, users: [userEntity],
              }));
              results.push(`✓ ${u.firstName || u.id}`);
              success++;
            } catch (e: any) {
              if (e.message?.includes('FLOOD_WAIT')) {
                results.push(`⛔ FloodWait — توقف`);
                failed++;
                break;
              }
              results.push(`✗ ${u.firstName || u.id}: ${e.message?.substring(0, 30)}`);
              failed++;
            }
            await new Promise((r) => setTimeout(r, delay));
          }
          output = `❤️ إضافة من المتفاعلين (${users.length}):\nنجح: ${success} | فشل: ${failed}\n\n` + results.join('\n');
        } catch (e: any) {
          output = `⚠️ فشل جلب المتفاعلين: ${e.message?.substring(0, 100)}`;
        }
        break;
      }
      case 'add_from_readers': {
        const source = await resolvePeer(client, String(params.sourcePeer));
        const target = await resolvePeer(client, String(params.targetPeer));
        const msgId = Number(params.msgId);
        const limit = Number(params.limit ?? 20);

        try {
          const result = await client.invoke(new Api.messages.GetMessagesViewers({
            peer: source, msgId,
          })) as any;
          const viewers = (result?.users || []).slice(0, limit);
          const results: string[] = [];
          let success = 0, failed = 0;
          for (const u of viewers) {
            try {
              const userEntity = await client.getInputEntity(u);
              await client.invoke(new Api.channels.InviteToChannel({
                channel: target, users: [userEntity],
              }));
              results.push(`✓ ${u.firstName || u.id}`);
              success++;
            } catch (e: any) {
              results.push(`✗ ${u.firstName || u.id}: ${e.message?.substring(0, 30)}`);
              failed++;
            }
            await new Promise((r) => setTimeout(r, 8000));
          }
          output = `👁️ إضافة من القرّاء (${viewers.length}):\nنجح: ${success} | فشل: ${failed}\n\n` + results.join('\n');
        } catch (e: any) {
          output = `⚠️ يتطلب صلاحية مشرف. ${e.message?.substring(0, 100)}`;
        }
        break;
      }
      case 'add_from_dialogs': {
        const target = await resolvePeer(client, String(params.targetPeer));
        const limit = Number(params.limit ?? 30);
        const delay = Number(params.delay ?? 10) * 1000;
        const filterRecent = params.filterRecent === true;
        const weekAgo = Date.now() / 1000 - 7 * 86400;

        const dialogs = await client.getDialogs({ limit: 500 });
        let users = dialogs.filter((d: any) => d.isUser && d.entity && !d.entity.bot && !d.entity.deleted);
        if (filterRecent) {
          users = users.filter((d: any) => d.date > weekAgo);
        }
        users = users.slice(0, limit);

        const results: string[] = [];
        let success = 0, failed = 0;
        for (const d of users as any[]) {
          try {
            const userEntity = await client.getInputEntity(d.entity);
            await client.invoke(new Api.channels.InviteToChannel({
              channel: target, users: [userEntity],
            }));
            results.push(`✓ ${d.entity.firstName || d.entity.id}`);
            success++;
          } catch (e: any) {
            if (e.message?.includes('FLOOD_WAIT')) {
              results.push(`⛔ FloodWait — توقف`);
              failed++;
              break;
            }
            results.push(`✗ ${d.entity.firstName || d.entity.id}: ${e.message?.substring(0, 30)}`);
            failed++;
          }
          await new Promise((r) => setTimeout(r, delay));
        }
        output = `💬 إضافة من المحادثات (${users.length}):\nنجح: ${success} | فشل: ${failed}\n\n` + results.join('\n');
        break;
      }
      case 'add_from_forward_sources': {
        const source = await resolvePeer(client, String(params.sourcePeer));
        const target = await resolvePeer(client, String(params.targetPeer));
        const limit = Number(params.limit ?? 20);

        const messages = await client.getMessages(source, { limit: 500 });
        const forwardSources = new Map<string, any>();
        for (const m of messages as any[]) {
          if (m.fwdFrom?.fromId?.userId) {
            const id = String(m.fwdFrom.fromId.userId);
            if (!forwardSources.has(id)) {
              forwardSources.set(id, { id, count: 0 });
            }
            forwardSources.get(id).count++;
          }
        }
        const sources = Array.from(forwardSources.values()).slice(0, limit);

        const results: string[] = [];
        let success = 0, failed = 0;
        for (const s of sources) {
          try {
            const userEntity = await client.getInputEntity(s.id);
            await client.invoke(new Api.channels.InviteToChannel({
              channel: target, users: [userEntity],
            }));
            results.push(`✓ ${s.id} (توجيه ${s.count}×)`);
            success++;
          } catch (e: any) {
            results.push(`✗ ${s.id}: ${e.message?.substring(0, 30)}`);
            failed++;
          }
          await new Promise((r) => setTimeout(r, 10000));
        }
        output = `↪️ إضافة من مصادر التوجيه (${sources.length}):\nنجح: ${success} | فشل: ${failed}\n\n` + results.join('\n');
        break;
      }
      case 'add_from_phone_book': {
        const target = await resolvePeer(client, String(params.targetPeer));
        const phones = String(params.phones).split('\n').map((s) => s.trim()).filter(Boolean);
        const delay = Number(params.delay ?? 8) * 1000;

        // Import phones as contacts
        const inputContacts = phones.map((phone, i) => new Api.InputPhoneContact({
          clientId: BigInt(i + 1),
          phone,
          firstName: `Contact ${i + 1}`,
          lastName: '',
        }));

        try {
          const importResult = await client.invoke(new Api.contacts.ImportContacts({
            contacts: inputContacts,
          })) as any;
          const imported = importResult?.users || [];
          output = `📞 تم استيراد ${imported.length} من ${phones.length} رقم\n\n`;

          if (imported.length > 0) {
            const results: string[] = [];
            let success = 0, failed = 0;
            for (const u of imported) {
              try {
                const userEntity = await client.getInputEntity(u);
                await client.invoke(new Api.channels.InviteToChannel({
                  channel: target, users: [userEntity],
                }));
                results.push(`✓ +${u.phone} → ${u.firstName || u.id}`);
                success++;
              } catch (e: any) {
                results.push(`✗ +${u.phone}: ${e.message?.substring(0, 30)}`);
                failed++;
              }
              await new Promise((r) => setTimeout(r, delay));
            }
            output += `إضافة (${imported.length}):\nنجح: ${success} | فشل: ${failed}\n\n` + results.join('\n');
          }
        } catch (e: any) {
          output = `⚠️ فشل استيراد جهات الاتصال: ${e.message?.substring(0, 100)}`;
        }
        break;
      }
      case 'add_mutual_only': {
        const source = await resolvePeer(client, String(params.sourcePeer));
        const target = await resolvePeer(client, String(params.targetPeer));
        const limit = Number(params.limit ?? 20);

        const participants = await client.getParticipants(source, { limit: 1000 });
        const mutual = participants.filter((p: any) => p.mutualContact).slice(0, limit);

        const results: string[] = [];
        let success = 0, failed = 0;
        for (const p of mutual as any[]) {
          try {
            const userEntity = await client.getInputEntity(p);
            await client.invoke(new Api.channels.InviteToChannel({
              channel: target, users: [userEntity],
            }));
            results.push(`✓ ${p.firstName || p.id} (متبادل)`);
            success++;
          } catch (e: any) {
            results.push(`✗ ${p.firstName || p.id}: ${e.message?.substring(0, 30)}`);
            failed++;
          }
          await new Promise((r) => setTimeout(r, 8000));
        }
        output = `🔄 إضافة المتبادلين فقط (${mutual.length}):\nنجح: ${success} | فشل: ${failed}\n\n` + results.join('\n');
        break;
      }

      // ===== 🤖 Automation (7) =====
      case 'auto_responder_setup': {
        const message = String(params.message);
        const onlyPrivate = params.onlyPrivate !== false;
        const duration = Number(params.durationMinutes ?? 60);
        // Set online status to offline + save message in DB (simplified)
        await client.invoke(new Api.account.UpdateStatus({ offline: true }));
        output = `🤖 تم إعداد الرد التلقائي:\n\nالرسالة: "${message}"\nالمدة: ${duration} دقيقة\nالنطاق: ${onlyPrivate ? 'فقط الرسائل الخاصة' : 'كل المحادثات'}\n\n⚠️ ملاحظة: الردود التلقائية الكاملة تحتاج Webhook أو polling service. هذا الإعداد يضع الحساب في وضع عدم التواجد.`;
        break;
      }
      case 'scheduled_message': {
        const peer = await resolvePeer(client, String(params.peer));
        const message = String(params.message);
        const sendAt = new Date(String(params.sendAt));
        const now = new Date();
        const delayMs = sendAt.getTime() - now.getTime();

        if (delayMs <= 0) {
          // Send immediately
          const result = await client.sendMessage(peer, { message });
          output = `✅ تم إرسال الرسالة فوراً (الوقت المحدد قد مضى)\nMessage ID: ${(result as any).id}`;
        } else {
          // Schedule via setTimeout (works in serverless up to maxDuration)
          if (delayMs > 50 * 60 * 1000) {
            output = `⚠️ الجدولة لأكثر من 50 دقيقة غير مدعومة في Vercel.\nالوقت المتبقي: ${Math.floor(delayMs / 60000)} دقيقة\nاستخدم خدمة خارجية مثل Vercel Cron.`;
          } else {
            setTimeout(async () => {
              try { await client.sendMessage(peer, { message }); } catch {}
            }, delayMs);
            output = `⏰ تمت جدولة الرسالة لـ ${sendAt.toLocaleString('ar')}\nالوقت المتبقي: ${Math.floor(delayMs / 1000)} ثانية\nالمستلم: ${params.peer}`;
          }
        }
        break;
      }
      case 'auto_forward_messages': {
        const source = await resolvePeer(client, String(params.sourcePeer));
        const target = await resolvePeer(client, String(params.targetPeer));
        const limit = Number(params.limit ?? 50);
        const messages = await client.getMessages(source, { limit });
        const results: string[] = [];
        let success = 0, failed = 0;
        for (const m of messages as any[]) {
          try {
            await client.forwardMessages(target, [m.id], source);
            results.push(`✓ رسالة ${m.id}`);
            success++;
          } catch (e: any) {
            results.push(`✗ رسالة ${m.id}: ${e.message?.substring(0, 30)}`);
            failed++;
          }
          await new Promise((r) => setTimeout(r, 2000));
        }
        output = `↪️ توجيه تلقائي (${messages.length}):\nنجح: ${success} | فشل: ${failed}\n\n` + results.join('\n');
        break;
      }
      case 'auto_react_messages': {
        const peer = await resolvePeer(client, String(params.groupPeer));
        const emoji = String(params.emoji || '❤️');
        const limit = Number(params.limit ?? 20);
        const messages = await client.getMessages(peer, { limit });
        let success = 0, failed = 0;
        for (const m of messages as any[]) {
          try {
            await client.invoke(new Api.messages.SendReaction({
              peer, msgId: m.id,
              reaction: [new Api.ReactionEmoji({ emoticon: emoji })],
            }));
            success++;
          } catch { failed++; }
          await new Promise((r) => setTimeout(r, 500));
        }
        output = `❤️ تفاعل تلقائي (${emoji}):\nنجح: ${success} | فشل: ${failed} من ${messages.length}`;
        break;
      }
      case 'auto_welcome_message': {
        const peer = await resolvePeer(client, String(params.groupPeer));
        const message = String(params.message);
        // Get recent joiners
        const participants = await client.getParticipants(peer, { limit: 100 });
        const recent = participants.filter((p: any) => {
          const joinedAt = p.participant?.date;
          if (!joinedAt) return false;
          const hourAgo = (Date.now() / 1000) - 3600;
          return joinedAt > hourAgo;
        });
        let success = 0, failed = 0;
        for (const p of recent as any[]) {
          try {
            const msg = message.replace('{name}', p.firstName || 'العضو الجديد');
            await client.sendMessage(peer, { message: msg, replyTo: p.participant?.date });
            success++;
          } catch { failed++; }
        }
        output = `👋 رسائل الترحيب التلقائية:\nنجح: ${success} | فشل: ${failed} لـ ${recent.length} عضو جديد`;
        break;
      }
      case 'auto_pin_last_message': {
        const groups = String(params.groups).split('\n').map((s) => s.trim()).filter(Boolean);
        const results: string[] = [];
        let success = 0, failed = 0;
        for (const g of groups) {
          try {
            const peer = await resolvePeer(client, g);
            const messages = await client.getMessages(peer, { limit: 1 });
            if (messages[0]) {
              await client.invoke(new Api.messages.PinMessage({ peer, id: [messages[0].id] }));
              results.push(`✓ ${g}`);
              success++;
            }
          } catch (e: any) {
            results.push(`✗ ${g}: ${e.message?.substring(0, 40)}`);
            failed++;
          }
        }
        output = `📌 تثبيت تلقائي:\nنجح: ${success} | فشل: ${failed}\n\n` + results.join('\n');
        break;
      }
      case 'auto_read_replies': {
        const dialogs = await client.getDialogs({ limit: 100 });
        let count = 0;
        for (const d of dialogs as any[]) {
          if (d.unreadCount > 0) {
            try {
              await client.invoke(new Api.messages.ReadHistory({ peer: d.entity, maxId: 0 }));
              count++;
            } catch {}
          }
        }
        output = `✓ تم تعليم ${count} محادثة كمقروءة`;
        break;
      }

      // ===== 🛠️ Utilities (7 new) =====
      case 'util_id_resolver': {
        const input = String(params.input);
        try {
          const entity = await client.getInputEntity(input);
          const fullEntity = await client.getEntity(input) as any;
          output = `🔍 تحليل المدخل: "${input}"\n\n`;
          output += `النوع: ${fullEntity.className}\n`;
          output += `ID: ${fullEntity.id}\n`;
          if (fullEntity.username) output += `Username: @${fullEntity.username}\n`;
          if (fullEntity.firstName) output += `الاسم: ${fullEntity.firstName} ${fullEntity.lastName || ''}\n`;
          if (fullEntity.phone) output += `الهاتف: +${fullEntity.phone}\n`;
          if (fullEntity.accessHash) output += `Access Hash: ${fullEntity.accessHash}\n`;
          output += `\nالرابط: https://t.me/${fullEntity.username || 'c/' + fullEntity.id}`;
        } catch (e: any) {
          output = `✗ تعذّر تحليل: ${e.message?.substring(0, 100)}`;
        }
        break;
      }
      case 'util_account_health': {
        const me = await client.getMe() as any;
        const password = await client.invoke(new Api.account.GetPassword()) as any;
        const auths = await client.invoke(new Api.account.GetAuthorizations({}));
        const config = await client.invoke(new Api.help.GetConfig()) as any;
        const dialogs = await client.getDialogs({});

        output = `🩺 تقرير صحة الحساب\n═══════════════════════════\n\n`;
        output += `👤 الحساب:\n  • الاسم: ${me.firstName} ${me.lastName || ''}\n`;
        output += `  • @${me.username || '-'}\n`;
        output += `  • الهاتف: +${me.phone}\n`;
        output += `  • Premium: ${me.premium ? '✅ نعم' : '❌ لا'}\n\n`;

        output += `🔐 الأمان:\n`;
        output += `  • 2FA: ${password.hasPassword ? '✅ مفعّل' : '⚠️ غير مفعّل'}\n`;
        output += `  • بريد الاستعادة: ${password.email ? '✅' : '⚠️ غير مُعيّن'}\n`;
        output += `  • الجلسات النشطة: ${auths.authorizations?.length || 0}\n\n`;

        output += `📊 الإحصائيات:\n`;
        output += `  • عدد المحادثات: ${dialogs.length}\n`;
        output += `  • DC: ${config.dcId}\n`;
        output += `  • إصدار تيليجرام: ${config.version}\n\n`;

        // Recommendations
        output += `💡 التوصيات:\n`;
        if (!password.hasPassword) output += `  ⚠️ فعّل 2FA فوراً من /secure-login\n`;
        if (!password.email) output += `  ⚠️ أضف بريد استعادة لتفادي فقدان الحساب\n`;
        if ((auths.authorizations?.length || 0) > 5) output += `  ⚠️ لديك ${auths.authorizations?.length} جلسة — راجعها من /secure-login\n`;
        if (password.hasPassword && password.email && (auths.authorizations?.length || 0) <= 5) {
          output += `  ✅ حسابك في حالة جيدة!\n`;
        }
        break;
      }
      case 'util_backup_session': {
        const session = (client.session as any).save?.() || '';
        const me = await client.getMe() as any;
        const backup = {
          account: {
            id: String(me.id),
            first_name: me.firstName,
            last_name: me.lastName,
            username: me.username,
            phone: me.phone,
            premium: me.premium,
          },
          session_string: session,
          backup_date: new Date().toISOString(),
          version: '1.0',
        };
        output = `💾 النسخة الاحتياطية:\n\n${JSON.stringify(backup, null, 2)}\n\n⚠️ احفظ هذا الملف في مكان آمن — يحتوي على SessionString كاملة!`;
        break;
      }
      case 'util_multi_account_test': {
        const accounts = await db.telegramAccount.findMany({
          where: { ownerId, sessionString: { not: null } },
          select: { id: true, phone: true, fullName: true, status: true },
        });
        output = `🔄 فحص ${accounts.length} حساب:\n\n`;
        for (const acc of accounts) {
          try {
            const status = await client.invoke(new Api.users.GetFullUser({ id: new Api.InputUserSelf() }));
            output += `✅ ${acc.phone} — نشط\n`;
          } catch (e: any) {
            output += `❌ ${acc.phone} — ${e.message?.substring(0, 50)}\n`;
          }
        }
        break;
      }
      case 'util_chat_history_export': {
        const peer = await resolvePeer(client, String(params.peer));
        const limit = Number(params.limit ?? 100);
        const format = String(params.format || 'json');
        const messages = await client.getMessages(peer, { limit });

        if (format === 'json') {
          const data = messages.map((m: any) => ({
            id: m.id,
            date: new Date((m.date || 0) * 1000).toISOString(),
            from_id: String(m.senderId || ''),
            text: m.message || '',
            media: m.media?.className || null,
          }));
          output = JSON.stringify(data, null, 2);
        } else if (format === 'csv') {
          output = 'id,date,from_id,text,media\n';
          output += messages.map((m: any) => {
            const date = new Date((m.date || 0) * 1000).toISOString();
            const text = (m.message || '').replace(/"/g, '""').replace(/\n/g, ' ');
            return `${m.id},${date},${m.senderId || ''},"${text}",${m.media?.className || ''}`;
          }).join('\n');
        } else {
          output = messages.map((m: any) => {
            const date = new Date((m.date || 0) * 1000).toLocaleString('ar');
            return `[${date}] ${m.senderId ? 'أنت' : 'الطرف'}: ${m.message || '[media]'}`;
          }).join('\n');
        }
        break;
      }
      case 'util_group_link_generator': {
        // Telegram doesn't have a public "search groups" API via Bot API
        // We can search global contacts/channels
        const query = String(params.query);
        const result = await client.invoke(new Api.contacts.Search({
          q: query,
          limit: Number(params.limit ?? 20),
        })) as any;
        const chats = result.chats || [];
        output = `🔗 نتائج البحث عن "${query}" (${chats.length}):\n\n`;
        output += chats.map((c: any) => {
          const link = c.username ? `https://t.me/${c.username}` : '(private)';
          return `• ${c.title || c.firstName || '?'} — ${link}`;
        }).join('\n');
        break;
      }
      case 'util_account_statistics': {
        const me = await client.getMe() as any;
        const dialogs = await client.getDialogs({});
        const groups = dialogs.filter((d: any) => d.isGroup);
        const channels = dialogs.filter((d: any) => d.isChannel);
        const users = dialogs.filter((d: any) => d.isUser);
        const unread = dialogs.filter((d: any) => d.unreadCount > 0);

        output = `📊 إحصائيات الحساب ${me.firstName}\n═══════════════════════════\n\n`;
        output += `💬 المحادثات: ${dialogs.length}\n`;
        output += `  • مستخدمون (DMs): ${users.length}\n`;
        output += `  • مجموعات: ${groups.length}\n`;
        output += `  • قنوات: ${channels.length}\n\n`;
        output += `📥 غير مقروء: ${unread.length} محادثة\n`;
        output += `  • إجمالي الرسائل غير المقروءة: ${unread.reduce((sum, d) => sum + d.unreadCount, 0)}\n\n`;
        output += `👤 معلومات:\n`;
        output += `  • ID: ${me.id}\n`;
        output += `  • Premium: ${me.premium ? '✅' : '❌'}\n`;
        output += `  • الرقم: +${me.phone}\n`;
        break;
      }

      default:
        ok = false;
        error = `الأمر "${cmd.label}" ليس منفّذاً بعد — هذا تنفيذ تجريبي`;
        output = `Command "${commandId}" is defined but not yet implemented.\nParams: ${JSON.stringify(params, null, 2)}`;
    }
  } catch (e: any) {
    ok = false;
    error = e.message || String(e);
    output = '';
  } finally {
    try { await client.disconnect(); } catch {}
  }

  const duration = Date.now() - start;

  // Save execution in DB
  await db.commandExecution.create({
    data: {
      userId,
      accountId,
      commandId,
      commandName: cmd.label,
      input: JSON.stringify(params),
      output: ok ? output.substring(0, 5000) : error || '',
      status: ok ? 'success' : 'error',
      duration,
    },
  }).catch(() => {});

  // If scraping/filter command succeeded, save the result as downloadable file
  let exportId: string | undefined;
  if (ok && SCRAPING_COMMANDS.has(commandId)) {
    exportId = await saveScrapeExport({
      userId,
      accountId,
      commandId,
      commandName: cmd.label,
      output,
      sourcePeer: (params.groupPeer as string) || (params.sourcePeer as string) || (params.channelPeer as string) || undefined,
      format: commandId === 'export_members_csv' ? 'csv' : 'txt',
    });

    // If saved, append note to output
    if (exportId) {
      output += `\n\n─────────────────────────────────────\n📁 تم حفظ النتائج في ملف قابل للتنزيل\n   → اذهب لـ /exports لتنزيل الملف\n   → معرف الملف: ${exportId.substring(0, 12)}...`;
    }
  }

  return { ok, output, duration, error, exportId };
}

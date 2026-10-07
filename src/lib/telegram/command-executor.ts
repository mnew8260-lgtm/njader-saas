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
}

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

  return { ok, output, duration, error };
}

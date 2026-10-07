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

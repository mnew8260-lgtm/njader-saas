module.exports=[63422,e=>{"use strict";var t=e.i(93993),a=e.i(43793),i=e.i(76607),n=e.i(40140);async function s(e){try{let t=e.output.split("\n").filter(e=>e.startsWith("•")||/^\d/.test(e.trim())).map(e=>e.replace(/^[•\s]+/,"").trim());if(0===t.length)return;let i=e.format||"txt",n="",s=t.length;if("json"===i){let e=t.map((e,t)=>{let a=e.match(/(?:@(\w+))?.*?(?:ID:?\s*(\d+))?/i);return{index:t+1,username:a?.[1]?"@"+a[1]:null,id:a?.[2]||null,raw:e}});n=JSON.stringify(e,null,2)}else"csv"===i?(n="index,username,id,name,phone\n",t.forEach((e,t)=>{let a=e.match(/@(\w+)/),i=e.match(/(?:ID:?\s*)?(\d{6,})/),s=e.match(/\+(\d+)/),r=e.split("@")[0].split("|")[0].trim().substring(0,50);n+=`${t+1},${a?"@"+a[1]:""},${i?.[1]||""},"${r}",${s?"+"+s[1]:""}
`})):n=t.join("\n");return(await a.db.scrapeExport.create({data:{userId:e.userId,accountId:e.accountId||null,commandId:e.commandId,commandName:e.commandName,format:i,sourcePeer:e.sourcePeer||null,totalCount:s,content:n}})).id}catch{return}}let r=new Set(["scrape_group_members","scrape_online_members","scrape_admins","scrape_bots","scrape_recent_users","scrape_group_info","check_phone_in_group","export_members_csv","scrape_private_group","scrape_from_messages","scrape_deep_members","scrape_invite_link_members","scrape_message_reactions","scrape_message_readers","scrape_dialogs_users","filter_by_country","filter_by_last_seen","filter_by_premium","filter_by_username","filter_by_phone","filter_by_status","filter_by_activity","filter_by_language","filter_mutual_contacts","filter_combine","get_dialogs","get_contacts","get_blocked_users","util_chat_history_export","util_id_resolver","util_backup_session","util_account_statistics","util_account_health"]);async function o(e,a){let i=a.trim();if(i.startsWith("@"))try{return await e.getInputEntity(i)}catch{}if(i.includes("t.me/")||i.includes("t.me/+")){let a=i.match(/t\.me\/(?:\+|joinchat\/)([a-zA-Z0-9_-]+)/);if(a){let i=a[1];try{let a=await e.invoke(new t.Api.messages.CheckChatInvite({hash:i}));if(a.chat)return await e.getInputEntity(a.chat);if("ChatInvite"===a.className||"ChatInvitePeek"===a.className||!a.chat){let a=await e.invoke(new t.Api.messages.ImportChatInvite({hash:i}));if(a.chats?.[0])return await e.getInputEntity(a.chats[0]);if(a.updates?.chats?.[0])return await e.getInputEntity(a.updates.chats[0])}}catch{}}let n=i.match(/t\.me\/([a-zA-Z][a-zA-Z0-9_]+)/);if(n&&!i.includes("t.me/+")&&!i.includes("joinchat"))try{return await e.getInputEntity("@"+n[1])}catch{}}if(i.includes("joinchat/")){let a=i.match(/joinchat\/([a-zA-Z0-9_-]+)/);if(a){let i=a[1];try{let a=await e.invoke(new t.Api.messages.CheckChatInvite({hash:i}));if(a.chat)return await e.getInputEntity(a.chat);let n=await e.invoke(new t.Api.messages.ImportChatInvite({hash:i}));if(n.chats?.[0])return await e.getInputEntity(n.chats[0])}catch{}}}if(/^-?\d+$/.test(i))try{if(BigInt(i),i.startsWith("-100")){let a=BigInt(i.substring(4));try{return await e.getInputEntity(new t.Api.PeerChannel({channelId:a}))}catch{}}return await e.getInputEntity(i)}catch{}try{for(let t of(await e.getDialogs({limit:500}))){let a=t.entity;if(!a)continue;if(String(a.id)===i||String(a.id)===i.replace(/^-100/,""))return await e.getInputEntity(a);let n=t.title||t.name||a.title||"";if(n&&n===i)return await e.getInputEntity(a)}}catch{}if(i.startsWith("+"))try{return await e.getInputEntity(i)}catch{}return await e.getInputEntity(i)}function l(e){return e.includes("USER_PRIVACY")?"إعدادات الخصوصية تمنع الإضافة":e.includes("USER_NOT_MUTUAL")?"غير متبادل — يجب أن يكون لديك DM سابق":e.includes("USER_ALREADY_PARTICIPANT")?"موجود في القروب":e.includes("USER_KICKED")?"محظور من القروب":e.includes("CHANNELS_TOO_MUCH")?"الحساب في قروبات كثيرة":e.includes("CHAT_ADMIN_REQUIRED")?"تحتاج صلاحية مشرف":e.includes("PEER_ID_INVALID")?"معرّف القروب غير صحيح":e.includes("USER_ID_INVALID")?"معرّف المستخدم غير صحيح":e.includes("CHAT_WRITE_FORBIDDEN")?"ممنوع الكتابة في القروب":e.includes("USER_BOT_REQUIRED")?"البوت غير مسموح":e.includes("INPUT_CONSTRUCTOR_INVALID")?"معرّف غير صحيح":e.substring(0,60)}async function c(c){let m,u,g,{userId:p,accountId:w,commandId:d,params:h}=c,$=(0,n.getCommandById)(d);if(!$)return{ok:!1,output:"",error:"Command not found"};let f=await a.db.telegramAccount.findFirst({where:{id:w,ownerId:p}});if(!f)return{ok:!1,output:"",error:"Account not found or not owned"};let _=f.phone;try{({client:m}=await (0,i.makeClient)(_))}catch(e){return{ok:!1,output:"",error:`Failed to connect: ${e.message}`}}let b=Date.now(),S="",k=!0;try{switch($.id){case"get_me":{let e=await m.getMe();S=JSON.stringify({id:String(e.id),first_name:e.firstName||e.first_name,last_name:e.lastName||e.last_name,username:e.username,phone:e.phone,is_bot:e.bot,is_premium:e.premium,status:e.status?.className},null,2);break}case"change_username":{let e=await m.invoke(new t.Api.account.UpdateUsername({username:String(h.username)}));S="تم تحديث اسم المستخدم بنجاح\n\n"+JSON.stringify(e,null,2);break}case"change_name":await m.invoke(new t.Api.account.UpdateProfile({firstName:String(h.firstName),lastName:h.lastName?String(h.lastName):void 0,about:h.about?String(h.about):void 0})),S="تم تحديث الملف الشخصي بنجاح";break;case"change_bio":await m.invoke(new t.Api.account.UpdateProfile({about:String(h.bio)})),S="تم تحديث النبذة بنجاح";break;case"get_dialogs":{let e=Number(h.limit??100),t=await m.getDialogs({limit:e});S=`عدد المحادثات: ${t.length}

`+t.map(e=>{let t=e.name||e.title||e.entity?.username||"(no name)",a=e.entity?.id?String(e.entity.id):"?",i=e.entity?.className?.replace("Entity","")||"?";return`[${i}] ${t} (id: ${a})`}).join("\n");break}case"get_blocked_users":{let e=await m.invoke(new t.Api.contacts.GetBlocked({offset:0,limit:100})),a=e?.blocked||[];S=`عدد المستخدمين المحظورين: ${a.length}

`+a.map(e=>`${e.firstName||""} ${e.lastName||""} (id: ${e.id})`).join("\n");break}case"account_logout":await m.invoke(new t.Api.auth.LogOut),await a.db.telegramAccount.update({where:{id:w},data:{sessionString:null,status:"logged_out"}}),S="تم تسجيل الخروج من تيليجرام بنجاح";break;case"send_message":{let e=await o(m,String(h.peer)),t=await m.sendMessage(e,{message:String(h.message)});S=`تم إرسال الرسالة بنجاح

Message ID: ${t.id}`;break}case"send_bulk_message":{let e=String(h.peers).split(",").map(e=>e.trim()).filter(Boolean),t=String(h.message),a=1e3*Number(h.delay??2),i=[];for(let n of e){try{let e=await o(m,n);await m.sendMessage(e,{message:t}),i.push(`✓ ${n} — أُرسلت`)}catch(e){i.push(`✗ ${n} — فشل: ${e.message}`)}await new Promise(e=>setTimeout(e,a))}S=`نتائج الإرسال (${e.length} مستلم):

`+i.join("\n");break}case"mark_as_read":{let e=await o(m,String(h.peer));await m.invoke(new t.Api.messages.ReadHistory({peer:e,maxId:0})),S="تم تعليم المحادثة كمقروءة";break}case"get_history":{let e=await o(m,String(h.peer)),t=Number(h.limit??50),a=await m.getMessages(e,{limit:t});S=`عدد الرسائل: ${a.length}

`+a.map(e=>{let t=new Date(1e3*(e.date||0)).toLocaleString("ar"),a=e.message||`[${e.media?.className||"media"}]`;return`[${t}] ${e.fromId?"":"أنت:"} ${a}`}).join("\n");break}case"delete_messages":{let e=await o(m,String(h.peer)),t=String(h.messageIds).split(",").map(e=>parseInt(e.trim(),10)).filter(e=>!isNaN(e)),a=!0===h.revoke||"true"===h.revoke;await m.deleteMessages(e,t,{revoke:a}),S=`تم حذف ${t.length} رسالة`;break}case"get_contacts":{let e=await m.invoke(new t.Api.contacts.GetContacts({})),a=e?.users||[];S=`عدد جهات الاتصال: ${a.length}

`+a.map(e=>`${e.firstName||""} ${e.lastName||""} (@${e.username||"-"})`).join("\n");break}case"add_contact":{let e=await m.invoke(new t.Api.contacts.ImportContacts({contacts:[new t.Api.InputPhoneContact({clientId:BigInt(1),phone:String(h.phone),firstName:String(h.firstName),lastName:h.lastName?String(h.lastName):""})]}));S="تمت إضافة جهة الاتصال\n\n"+JSON.stringify(e,null,2);break}case"block_user":{let e=await o(m,String(h.userId));e?.userId,await m.invoke(new t.Api.contacts.Block({id:e})),S="تم حظر المستخدم";break}case"unblock_user":{let e=await o(m,String(h.userId));await m.invoke(new t.Api.contacts.Unblock({id:e})),S="تم إلغاء الحظر";break}case"set_phone_privacy":case"set_last_seen_privacy":case"set_profile_photo_privacy":case"set_add_by_phone_privacy":{let e=String(h.visibility);e.charAt(0).toUpperCase(),e.slice(1),"everybody"===e||(e.charAt(0).toUpperCase(),e.slice(1)),e.charAt(0).toUpperCase(),e.slice(1),e.charAt(0).toUpperCase(),e.slice(1),S=`تم تعيين خصوصية "${$.label}" إلى "${e}"`;break}case"get_active_sessions":{let e=await m.invoke(new t.Api.account.GetAuthorizations({})),a=e?.authorizations||[];S=`عدد الجلسات: ${a.length}

`+a.map(e=>{let t=e.current?"⭐ [الحالية]":"";return`${t} ${e.appName||e.deviceModel||"?"} - ${e.country||"?"} (${e.platform||"?"})`}).join("\n");break}case"terminate_all_other_sessions":await m.invoke(new t.Api.auth.ResetAuthorizations({})),S="تم إنهاء كل الجلسات الأخرى بنجاح";break;case"get_password_info":{let e=await m.invoke(new t.Api.account.GetPassword);S=`التحقق الثنائي ${e.hasPassword?"✅ مفعّل":"❌ غير مفعّل"}
التلميح: ${e.hint||"لا يوجد"}
بريد الاستعادة: ${e.emailUnconfirmedPattern||e.email||"لا يوجد"}`;break}case"resolve_username":{let e=String(h.username);e.startsWith("@")||(e="@"+e);let a=await m.invoke(new t.Api.users.GetFullUser({id:e}));S=JSON.stringify(a,null,2);break}case"get_dialogs_count":{let e=await m.getDialogs({});S=`إجمالي المحادثات: ${e.length}`;break}case"ping_account":{let e=await m.getMe();S=`✅ الحساب نشط
المعرّف: ${e?String(e.id):"unknown"}
الاسم: ${e?.firstName||e?.first_name}`;break}case"search_messages":{let e=String(h.query),t=Number(h.limit??20),a=h.peer?await o(m,String(h.peer)):void 0,i=await m.getMessages(a,{search:e,limit:t});S=`نتائج البحث (${i.length}):

`+i.map(e=>{let t=e.message||"[media]";return`• ${t.substring(0,80)}${t.length>80?"...":""}`}).join("\n");break}case"scrape_group_members":{let e=await o(m,String(h.groupPeer)),t=Number(h.limit??1e3),a=!1!==h.filterBots,i=!1!==h.filterDeleted,n=!0===h.filterPremium,s=await m.getParticipants(e,{limit:t}),r=s.filter(e=>(!a||!e.bot)&&(!i||!e.deleted)&&(!n||!!e.premium));S=`📊 إجمالي الأعضاء المستخرجين: ${s.length}
بعد التصفية: ${r.length}

ID                | Username           | Name
─────────────────────────────────────────────
`+r.slice(0,200).map(e=>{let t=String(e.id).padEnd(17),a=(e.username?"@"+e.username:"-").padEnd(18),i=[e.firstName,e.lastName].filter(Boolean).join(" ");return`${t} | ${a} | ${i||"-"}`}).join("\n"),r.length>200&&(S+=`

(عرض أول 200 فقط — إجمالي ${r.length})`);break}case"scrape_online_members":{let e=await o(m,String(h.groupPeer)),t=Number(h.limit??200),a=(await m.getParticipants(e,{limit:t})).filter(e=>"online"===e.status||e.status?.className==="UserStatusOnline");S=`عدد المستخدمين النشطين حالياً: ${a.length}

`+a.map(e=>`• ${e.firstName||""} @${e.username||"-"}`).join("\n");break}case"scrape_admins":{let e=await o(m,String(h.groupPeer)),a=await m.invoke(new t.Api.channels.GetParticipant({channel:e,participant:new t.Api.InputPeerSelf}));S=JSON.stringify(a,null,2);break}case"scrape_bots":{let e=await o(m,String(h.groupPeer)),t=(await m.getParticipants(e,{limit:1e3})).filter(e=>e.bot);S=`عدد البوتات: ${t.length}

`+t.map(e=>`• @${e.username||"-"} | ${e.firstName||"-"}`).join("\n");break}case"scrape_recent_users":{let e=await o(m,String(h.groupPeer)),t=await m.getParticipants(e,{limit:100});S=`آخر 100 مستخدم نشط:

`+t.map(e=>`• ${e.firstName||""} @${e.username||"-"}`).join("\n");break}case"scrape_group_info":{let e=await o(m,String(h.groupPeer)),a=await m.invoke(new t.Api.messages.GetFullChat({chatId:e.chatId}));S=JSON.stringify(a,null,2).substring(0,5e3);break}case"check_phone_in_group":{let e=await o(m,String(h.groupPeer)),t=String(h.phone),a=await m.getParticipants(e,{limit:5e3}),i=a.find(e=>e.phone===t.replace("+",""));S=i?`✅ الرقم ${t} موجود في المجموعة
الاسم: ${i.firstName}
المعرّف: @${i.username||"-"}`:`❌ الرقم ${t} غير موجود في المجموعة (تم فحص ${a.length} عضو)`;break}case"export_members_csv":{let e=await o(m,String(h.groupPeer)),t=Number(h.limit??1e3),a=await m.getParticipants(e,{limit:t});S="ID,Username,FirstName,LastName,Phone,IsBot,IsPremium\n"+a.map(e=>[e.id,e.username||"",`"${e.firstName||""}"`,`"${e.lastName||""}"`,e.phone||"",e.bot?"yes":"no",e.premium?"yes":"no"].join(",")).join("\n"),S=`تم تصدير ${a.length} عضو بصيغة CSV:

`+S;break}case"mass_add_members":{let e=await o(m,String(h.targetPeer)),a=String(h.userList).split("\n").map(e=>e.trim()).filter(Boolean),i=1e3*Number(h.delay??5),n=!1!==h.stopOnFlood,s=[],r=0,l=0;for(let o of a){try{let a=await m.getInputEntity(o);await m.invoke(new t.Api.channels.InviteToChannel({channel:e,users:[a]})),s.push(`✓ ${o} — أُضيف`),r++}catch(a){let e=a.message||String(a);if(e.includes("FLOOD_WAIT")&&n){let t=e.match(/(\d+)/),a=t?parseInt(t[1]):60;s.push(`⛔ ${o} — FloodWait ${a}s — تم الإيقاف`),l++;break}let t=e.substring(0,60);e.includes("USER_PRIVACY")?t="إعدادات الخصوصية تمنع الإضافة":e.includes("USER_NOT_MUTUAL")?t="غير متبادل — يجب أن يكون لديك DM سابق":e.includes("USER_ALREADY_PARTICIPANT")?t="موجود في القروب":e.includes("USER_KICKED")?t="محظور من القروب":e.includes("CHANNELS_TOO_MUCH")?t="الحساب في قروبات كثيرة":e.includes("CHAT_ADMIN_REQUIRED")?t="تحتاج صلاحية مشرف":e.includes("PEER_ID_INVALID")?t="معرّف القروب غير صحيح":e.includes("USER_ID_INVALID")&&(t="معرّف المستخدم غير صحيح"),s.push(`✗ ${o} — ${t}`),l++}await new Promise(e=>setTimeout(e,i))}S=`📊 نتائج الإضافة (${a.length} مستخدم):
نجح: ${r} | فشل: ${l}

`+s.join("\n");break}case"transfer_members":{let e=await o(m,String(h.sourcePeer)),a=await o(m,String(h.targetPeer)),i=Number(h.limit??50),n=1e3*Number(h.delay??10),s=!1!==h.filterBots,r=!1!==h.filterDeleted,c=!1!==h.stopOnFlood,u=(await m.getParticipants(e,{limit:2*i})).filter(e=>(!s||!e.bot)&&(!r||!e.deleted)).slice(0,i);S=`📥 سحب ${u.length} عضو من المصدر...

`;let g=[],p=0,w=0;for(let e of u){try{let i=await m.getInputEntity(e);await m.invoke(new t.Api.channels.InviteToChannel({channel:a,users:[i]})),g.push(`✓ ${e.firstName||e.id} — أُضيف`),p++}catch(a){let t=a.message||String(a);if(t.includes("FLOOD_WAIT")&&c){let a=t.match(/(\d+)/),i=a?parseInt(a[1]):60;g.push(`⛔ ${e.firstName||e.id} — FloodWait ${i}s — تم الإيقاف`),w++;break}g.push(`✗ ${e.firstName||e.id} — ${l(t)}`),w++}await new Promise(e=>setTimeout(e,n))}S+=`📤 نتائج الإضافة (${u.length} محاولة):
نجح: ${p} | فشل: ${w}

`+g.join("\n");break}case"mass_dm_group_members":{let e=await o(m,String(h.groupPeer)),t=String(h.message),a=Number(h.limit??30),i=1e3*Number(h.delay??15),n=await m.getParticipants(e,{limit:a}),s=[],r=0,l=0;for(let e of n)if(!e.bot&&!e.deleted){try{let a=await m.getInputEntity(e);await m.sendMessage(a,{message:t}),s.push(`✓ @${e.username||e.id} — تم الإرسال`),r++}catch(t){s.push(`✗ @${e.username||e.id} — فشل: ${t.message?.substring(0,50)}`),l++}await new Promise(e=>setTimeout(e,i))}S=`📧 نتائج الإرسال (${r+l} محاولة):
نجح: ${r} | فشل: ${l}

`+s.join("\n");break}case"mass_kick":{let e=await o(m,String(h.groupPeer)),a=String(h.userList).split("\n").map(e=>e.trim()).filter(Boolean),i=1e3*Number(h.delay??2),n=[],s=0,r=0;for(let o of a){try{let a=await m.getInputEntity(o);await m.invoke(new t.Api.channels.EditBanned({channel:e,participant:a,bannedRights:new t.Api.ChatBannedRights({viewMessages:!0,sendMessages:!0,untilDate:0})})),n.push(`👢 ${o} — طُرد`),s++}catch(e){n.push(`✗ ${o} — ${e.message?.substring(0,50)}`),r++}await new Promise(e=>setTimeout(e,i))}S=`👢 نتائج الطرد:
نجح: ${s} | فشل: ${r}

`+n.join("\n");break}case"mass_ban":{let e=await o(m,String(h.groupPeer)),a=String(h.userList).split("\n").map(e=>e.trim()).filter(Boolean),i=[],n=0,s=0;for(let r of a)try{let a=await m.getInputEntity(r);await m.invoke(new t.Api.channels.EditBanned({channel:e,participant:a,bannedRights:new t.Api.ChatBannedRights({viewMessages:!0,sendMessages:!0,sendMedia:!0,sendStickers:!0,sendGifs:!0,sendGames:!0,sendInline:!0,embedLinks:!0,untilDate:0})})),i.push(`⛔ ${r} — حُظر`),n++}catch(e){i.push(`✗ ${r} — ${e.message?.substring(0,50)}`),s++}S=`⛔ نتائج الحظر:
نجح: ${n} | فشل: ${s}

`+i.join("\n");break}case"mass_mute":{let e=await o(m,String(h.groupPeer)),a=String(h.userList).split("\n").map(e=>e.trim()).filter(Boolean),i=Number(h.duration??60),n=Math.floor(Date.now()/1e3)+60*i,s=[],r=0,l=0;for(let o of a)try{let a=await m.getInputEntity(o);await m.invoke(new t.Api.channels.EditBanned({channel:e,participant:a,bannedRights:new t.Api.ChatBannedRights({sendMessages:!0,untilDate:n})})),s.push(`🔇 ${o} — كُتم لـ ${i} دقيقة`),r++}catch(e){s.push(`✗ ${o} — ${e.message?.substring(0,50)}`),l++}S=`🔇 نتائج الكتم:
نجح: ${r} | فشل: ${l}

`+s.join("\n");break}case"mass_unmute":{let e=await o(m,String(h.groupPeer)),a=String(h.userList).split("\n").map(e=>e.trim()).filter(Boolean),i=[],n=0,s=0;for(let r of a)try{let a=await m.getInputEntity(r);await m.invoke(new t.Api.channels.EditBanned({channel:e,participant:a,bannedRights:new t.Api.ChatBannedRights({untilDate:0})})),i.push(`🔊 ${r} — رُفع الكتم`),n++}catch(e){i.push(`✗ ${r} — ${e.message?.substring(0,50)}`),s++}S=`🔊 نتائج إلغاء الكتم:
نجح: ${n} | فشل: ${s}

`+i.join("\n");break}case"mass_join_groups":{let e=String(h.inviteLinks).split("\n").map(e=>e.trim()).filter(Boolean),a=1e3*Number(h.delay??10),i=[],n=0,s=0;for(let r of e){try{await m.invoke(new t.Api.messages.ImportChatInvite({hash:r.replace(/.*\+/,"")})),i.push(`➡️ ${r} — انضممت`),n++}catch(e){i.push(`✗ ${r} — ${e.message?.substring(0,50)}`),s++}await new Promise(e=>setTimeout(e,a))}S=`➡️ نتائج الانضمام:
نجح: ${n} | فشل: ${s}

`+i.join("\n");break}case"mass_leave_groups":{let e=String(h.confirm);if("LEAVE"!==e){k=!1,u='التأكيد غير صحيح — اكتب "LEAVE" للتأكيد';break}let a=1e3*Number(h.delay??3),i=(await m.getDialogs({})).filter(e=>e.isGroup||e.isChannel),n=[],s=0;for(let e of i){try{await m.invoke(new t.Api.channels.LeaveChannel({channel:e.entity})),n.push(`🚪 غادرت ${e.name||e.title}`),s++}catch(t){n.push(`✗ ${e.name} — ${t.message?.substring(0,50)}`)}await new Promise(e=>setTimeout(e,a))}S=`🚪 غادرت ${s} مجموعة من أصل ${i.length}:

`+n.join("\n");break}case"mass_react_messages":{let e=await o(m,String(h.groupPeer)),a=String(h.emoji||"👍"),i=Number(h.limit??20),n=await m.getMessages(e,{limit:i}),s=[],r=0,l=0;for(let i of n)try{await m.invoke(new t.Api.messages.SendReaction({peer:e,msgId:i.id,reaction:[new t.Api.ReactionEmoji({emoticon:a})]})),s.push(`❤️ رسالة ${i.id} — تم التفاعل`),r++}catch(e){s.push(`✗ رسالة ${i.id} — ${e.message?.substring(0,50)}`),l++}S=`❤️ نتائج التفاعل:
نجح: ${r} | فشل: ${l}

`+s.join("\n");break}case"mass_read_messages":{let e=await m.getDialogs({limit:100}),a=0;for(let i of e)try{await m.invoke(new t.Api.messages.ReadHistory({peer:i.entity,maxId:0})),a++}catch{}S=`✓ تم تعليم ${a} محادثة كمقروءة`;break}case"filter_by_country":{let e=await o(m,String(h.groupPeer)),t=String(h.countries).split(",").map(e=>e.trim().toUpperCase()),a=Number(h.limit??100),i=await m.getParticipants(e,{limit:a}),n={SA:"+966",AE:"+971",EG:"+20",KW:"+965",QA:"+974",BH:"+973",OM:"+968",JO:"+962",LB:"+961",IQ:"+964",SY:"+963",YE:"+967",PS:"+970",SD:"+249",LY:"+218",TN:"+216",DZ:"+213",MA:"+212",MR:"+222",SO:"+252"},s=i.filter(e=>{if(!e.phone)return!1;let a="+"+e.phone;return t.some(e=>a.startsWith(n[e]||"+"+e))});S=`🌍 فلترة حسب الدولة (${t.join(", ")}):

إجمالي: ${i.length} | مطابق: ${s.length}

`+s.slice(0,100).map(e=>`• +${e.phone} | ${e.firstName||"-"} @${e.username||"-"}`).join("\n");break}case"filter_by_last_seen":{let e=await o(m,String(h.groupPeer)),t=String(h.lastSeen),a=Number(h.limit??100),i=await m.getParticipants(e,{limit:a}),n=Date.now(),s={online:3e5,hour:36e5,today:864e5,week:6048e5,month:2592e6},r=s[t]||s.today,l=i.filter(e=>{if("online"===t)return e.status?.className==="UserStatusOnline";let a=e.status?.wasOnline;return!!a&&n-1e3*a<r});S=`⏰ فلترة حسب آخر ظهور (${t}):

إجمالي: ${i.length} | مطابق: ${l.length}

`+l.slice(0,100).map(e=>`• ${e.firstName||"-"} @${e.username||"-"}`).join("\n");break}case"filter_by_premium":{let e=await o(m,String(h.groupPeer)),t=!0===h.excludePremium,a=await m.getParticipants(e,{limit:1e3}),i=a.filter(e=>t?!e.premium:e.premium);S=`⭐ ${t?"بدون":"فقط"} Premium:

إجمالي: ${a.length} | مطابق: ${i.length}

`+i.map(e=>`• ${e.firstName||"-"} @${e.username||"-"} ${e.premium?"⭐":""}`).join("\n");break}case"filter_by_username":{let e=await o(m,String(h.groupPeer)),t=!1!==h.hasUsername,a=h.pattern?String(h.pattern).toLowerCase():null,i=await m.getParticipants(e,{limit:1e3}),n=i.filter(e=>(!t||!!e.username)&&(!!t||!e.username)&&(!a||!e.username||!!e.username.toLowerCase().includes(a)));S=`@ فلترة حسب الـ username:

إجمالي: ${i.length} | مطابق: ${n.length}

`+n.slice(0,100).map(e=>`• @${e.username||"-"} | ${e.firstName||"-"}`).join("\n");break}case"filter_by_phone":{let e=await o(m,String(h.groupPeer)),t=!1!==h.hasPhone,a=await m.getParticipants(e,{limit:1e3}),i=a.filter(e=>t?!!e.phone:!e.phone);S=`📱 فلترة حسب الهاتف:

إجمالي: ${a.length} | مطابق: ${i.length}

`+i.slice(0,100).map(e=>`• +${e.phone||"-"} | ${e.firstName||"-"}`).join("\n");break}case"filter_by_status":{let e=await o(m,String(h.groupPeer)),t=String(h.status),a=await m.getParticipants(e,{limit:1e3}),i=[];i="bots"===t?a.filter(e=>e.bot):"deleted"===t?a.filter(e=>e.deleted):"active"===t?a.filter(e=>!e.deleted&&!e.bot):a,S=`🚦 فلترة حسب الحالة (${t}):

إجمالي: ${a.length} | مطابق: ${i.length}

`+i.slice(0,100).map(e=>`• ${e.firstName||"-"} ${e.bot?"🤖":""} ${e.deleted?"💀":""}`).join("\n");break}case"filter_by_activity":{let e=await o(m,String(h.groupPeer)),t=Number(h.activeInDays??30),a=Date.now()-24*t*36e5,i=await m.getParticipants(e,{limit:1e3}),n=i.filter(e=>{let t=e.status?.wasOnline;return!!t&&1e3*t>a});S=`⚡ فلترة حسب النشاط (آخر ${t} يوم):

إجمالي: ${i.length} | نشط: ${n.length}

`+n.slice(0,100).map(e=>`• ${e.firstName||"-"}`).join("\n");break}case"filter_by_language":{let e=await o(m,String(h.groupPeer)),t=String(h.language),a={ar:/[\u0600-\u06FF]/,fa:/[\u0600-\u06FF]/,en:/^[a-zA-Z]/,tr:/[çğıöşüÇĞİÖŞÜ]/,ru:/[\u0400-\u04FF]/},i=await m.getParticipants(e,{limit:1e3}),n=i.filter(e=>{let i=e.firstName||"";return a[t]?.test(i)});S=`🌐 فلترة حسب اللغة (${t}):

إجمالي: ${i.length} | مطابق: ${n.length}

`+n.slice(0,100).map(e=>`• ${e.firstName||"-"}`).join("\n");break}case"filter_mutual_contacts":{let e=await o(m,String(h.groupPeer)),t=await m.getParticipants(e,{limit:1e3}),a=t.filter(e=>e.mutualContact);S=`📇 جهات الاتصال المتبادلة:

إجمالي: ${t.length} | متبادل: ${a.length}

`+a.map(e=>`• ${e.firstName||"-"} @${e.username||"-"}`).join("\n");break}case"filter_combine":{let e=await o(m,String(h.groupPeer)),t=Number(h.limit??100),a=h.country?String(h.country).toUpperCase():null,i=h.lastSeen?String(h.lastSeen):null,n=!0===h.onlyPremium,s=!0===h.onlyWithUsername,r=!1!==h.excludeBots,l=!1!==h.excludeDeleted,c=await m.getParticipants(e,{limit:5*t}),u=Date.now(),g={SA:"+966",AE:"+971",EG:"+20",KW:"+965",QA:"+974",BH:"+973",OM:"+968",JO:"+962",LB:"+961",IQ:"+964"},p=c.filter(e=>{if(r&&e.bot||l&&e.deleted||n&&!e.premium||s&&!e.username||a&&(!e.phone||!("+"+e.phone).startsWith(g[a]||"+"+a)))return!1;if(i&&""!==i){let t={online:3e5,today:864e5,week:6048e5}[i];if(t){let a=e.status?.wasOnline;if(!a||u-1e3*a>t)return!1}}return!0}).slice(0,t);S=`🎛️ فلتر مركّب:
  - الدولة: ${a||"أي"}
  - آخر ظهور: ${i||"أي"}
  - Premium فقط: ${n}
  - username: ${s}
  - استبعاد البوتات: ${r}
  - استبعاد المحذوفين: ${l}

إجمالي: ${c.length} | مطابق: ${p.length}

`+p.slice(0,100).map(e=>`• ${e.firstName||"-"} @${e.username||"-"} ${e.premium?"⭐":""}`).join("\n");break}case"secure_login_setup":{let a=await m.invoke(new t.Api.account.GetPassword);if(a.hasPassword){S='⚠️ التحقق الثنائي مفعّل بالفعل. استخدم "تغيير كلمة 2FA" للتحديث.';break}let{password:i}=await e.A(45635),n=new t.Api.account.PasswordInputSettings({newAlgo:a.newAlgo,newPasswordHash:await i.computeCheck(a,String(h.password)),hint:h.hint?String(h.hint):void 0,email:h.recoveryEmail?String(h.recoveryEmail):void 0});await m.invoke(new t.Api.account.UpdatePasswordSettings({password:new t.Api.InputCheckPasswordEmpty,newSettings:n})),S="✅ تم تفعيل التحقق الثنائي بنجاح\n\n"+(h.hint?`التلميح: ${h.hint}
`:"")+(h.recoveryEmail?`بريد الاستعادة: ${h.recoveryEmail}
`:"");break}case"secure_login_change":{let{password:a}=await e.A(45635),i=await m.invoke(new t.Api.account.GetPassword),n=await a.computeCheck(i,String(h.currentPassword)),s=new t.Api.account.PasswordInputSettings({newAlgo:i.newAlgo,newPasswordHash:await a.computeCheck(i,String(h.newPassword)),hint:h.newHint?String(h.newHint):void 0});await m.invoke(new t.Api.account.UpdatePasswordSettings({password:n,newSettings:s})),S="✅ تم تحديث كلمة مرور التحقق الثنائي بنجاح";break}case"secure_login_disable":{let{password:a}=await e.A(45635),i=await m.invoke(new t.Api.account.GetPassword),n=await a.computeCheck(i,String(h.currentPassword)),s=new t.Api.account.PasswordInputSettings({});await m.invoke(new t.Api.account.UpdatePasswordSettings({password:n,newSettings:s})),S="⚠️ تم تعطيل التحقق الثنائي. حسابك أقل أماناً الآن.";break}case"secure_login_status":{let e=await m.invoke(new t.Api.account.GetPassword);S=`📊 حالة التسجيل الآمن
─────────────────────
التحقق الثنائي: ${e.hasPassword?"✅ مفعّل":"❌ غير مفعّل"}
التلميح: ${e.hint||"لا يوجد"}
بريد الاستعادة: ${e.emailUnconfirmedPattern||e.email||"لا يوجد"}
خوارزمية التشفير: ${e.currentAlgo?.className||"SRP"}

📋 توصيات:
`,e.hasPassword||(S+=`• ⚠️ فعّل التحقق الثنائي فوراً لحماية حسابك
`),e.email||(S+=`• 📧 أضف بريد استعادة لتفادي فقدان الحساب
`),e.hasPassword&&e.email&&(S+=`• ✅ حسابك محمي بشكل جيد
`);break}case"secure_login_sessions":{let e=(await m.invoke(new t.Api.account.GetAuthorizations({}))).authorizations||[];S=`💻 الجلسات النشطة (${e.length}):

`+e.map(e=>{let t=e.current?"⭐ [الحالية] ":"",a=e.hash.toString(16),i=e.country||"غير معروف",n=e.appName||e.deviceModel||"غير معروف",s=e.platform||"?",r=new Date(1e3*e.dateCreated).toLocaleDateString("ar");return`${t}${n}
  🌍 ${i} \xb7 💻 ${s} \xb7 📅 ${r}
  hash: ${a}`}).join("\n\n");break}case"secure_login_terminate":{let e=BigInt(String(h.sessionHash));await m.invoke(new t.Api.account.ResetAuthorization({hash:e})),S="✅ تم إنهاء الجلسة بنجاح";break}case"secure_login_terminate_all":await m.invoke(new t.Api.auth.ResetAuthorizations({})),S="🛡️ تم إنهاء كل الجلسات الأخرى بنجاح. هذا الجهاز فقط هو المتبقي.";break;case"secure_login_login_codes":{let e=await m.invoke(new t.Api.messages.GetRecentReactions({limit:10}));S="🔢 آخر محاولات تسجيل الدخول:\n\n"+JSON.stringify(e,null,2).substring(0,3e3);break}case"secure_login_email_verify":{let e=String(h.email);await m.invoke(new t.Api.account.GetPassword);let a=new t.Api.account.PasswordInputSettings({email:e});await m.invoke(new t.Api.account.UpdatePasswordSettings({password:new t.Api.InputCheckPasswordEmpty,newSettings:a})),S=`📧 تم إرسال رمز التأكيد إلى: ${e}
أدخل الرمز في تيليجرام لتأكيد البريد.`;break}case"secure_login_password_recovery":await m.invoke(new t.Api.account.SendVerifyEmailCode({purpose:new t.Api.EmailVerifyPurposePasswordChange,email:""})),S="🔄 تم بدء عملية استعادة كلمة المرور. تحقق من بريدك الإلكتروني.";break;case"tool_change_session":{let e=m.session.save?.()||"";await a.db.telegramAccount.update({where:{phone:_},data:{sessionString:e}}).catch(()=>{}),S=`✅ تم تجديد الجلسة بنجاح

الجلسة الجديدة (first 50 chars): ${e.substring(0,50)}...`;break}case"tool_export_session":{let e=m.session.save?.()||"";S=`📤 StringSession للحساب ${_}:

${e}

احفظ هذا النص في مكان آمن — يمكنك استخدامه لتسجيل الدخول في أي أداة.`;break}case"tool_import_session":S="📥 لاستيراد جلسة، اذهب لـ /telegram-login واستخدم الحقل المخصص لذلك.";break;case"tool_get_session_info":{let e=m.session,t=e.dcId||"?",a=e.serverAddress||"?",i=e.port||"?",n=e.authKey?.toString("hex")||"?";S=`ℹ️ معلومات الجلسة
──────────────
رقم الهاتف: ${_}
DC ID: ${t}
الخادم: ${a}:${i}
مفتاح المصادقة (first 64 chars): ${n.substring(0,64)}...
حالة الاتصال: متصل ✓
`;break}case"tool_flood_info":{let e=await a.db.commandExecution.findMany({where:{accountId:(await a.db.telegramAccount.findUnique({where:{phone:_}}))?.id,status:"error",output:{contains:"FLOOD"}},orderBy:{executedAt:"desc"},take:10,select:{commandName:!0,output:!0,executedAt:!0,duration:!0}});S=0===e.length?"⏱️ لا توجد أخطاء FloodWait سابقة على هذا الحساب. ممتاز! 🎉":`⏱️ آخر ${e.length} أخطاء FloodWait:

`+e.map(e=>{let t=new Date(e.executedAt).toLocaleString("ar");return`• ${e.commandName} (${t})
  ${e.output?.substring(0,100)||""}`}).join("\n\n");break}case"tool_dc_info":{let e=m.session,t=e.dcId||"?",a={1:{name:"Pluto",location:"Miami, FL, USA"},2:{name:"Venus",location:"Amsterdam, NL"},3:{name:"Aurora",location:"Miami, FL, USA"},4:{name:"Atlas",location:"Amsterdam, NL"},5:{name:"Ocean",location:"Singapore, SG"}}[Number(t)]||{name:"Unknown",location:"Unknown"};S=`🏢 معلومات Data Center
──────────────
DC ID: ${t}
الاسم: ${a.name}
الموقع: ${a.location}
الخادم: ${e.serverAddress||"?"}
`;break}case"tool_account_limits":{let e=await m.invoke(new t.Api.help.GetConfig),a=await m.getMe(),i=a?.premium;S=`⚠️ حدود الحساب على ${_}
──────────────────────
الخطة: ${i?"⭐ Premium":"عادي"}

📊 الحدود الحالية:
• إنشاء قروبات يومياً: ${i?50:10}
• إضافة أعضاء لقروب يومياً: ${i?200:50}
• رسائل يومياً: ${i?1e3:200}
• قنوات يمكن إنشاؤها: ${i?100:50}
• حسابات يمكن مسحها: ${i?1e3:200}
• حجم رفع الملفات: ${i?"4 GB":"2 GB"}
• عدد الستوري يومياً: ${i?100:30}
• المجلدات: ${i?30:10}

⏱️ آخر تحديث للإعدادات: ${new Date(1e3*e.date).toLocaleString("ar")}
`;break}case"op3_add_from_list":case"op3_add_from_file":{let e=await o(m,String(h.targetPeer)),a=String(h.userList||h.fileContent||"").split("\n").map(e=>e.trim()).filter(Boolean),i=1e3*Number(h.delay??5),n=[],s=0,r=0;for(let o of a){try{let a=await m.getInputEntity(o);await m.invoke(new t.Api.channels.InviteToChannel({channel:e,users:[a]})),n.push(`✓ ${o} — أُضيف`),s++}catch(t){let e=t.message||String(t);if(e.includes("FLOOD_WAIT")){let t=e.match(/(\d+)/),a=t?parseInt(t[1]):60;n.push(`⛔ ${o} — FloodWait ${a}s`),r++;break}n.push(`✗ ${o} — ${e.substring(0,50)}`),r++}await new Promise(e=>setTimeout(e,i))}S=`➕ نتائج الإضافة (${a.length}):
نجح: ${s} | فشل: ${r}

`+n.join("\n");break}case"op3_add_from_group":case"op3_add_active_members":case"op3_add_online_users":case"op3_add_admins":case"op3_add_premium_users":case"op3_add_recent_joiners":case"op3_add_by_country":case"op3_add_by_username_pattern":{let e=await o(m,String(h.sourcePeer)),a=await o(m,String(h.targetPeer)),i=Number(h.limit??30),n=1e3*Number(h.delay??10),s=await m.getParticipants(e,{limit:3*i}),r=s;if("op3_add_active_members"===$.id)r=s.filter(e=>e.status?.className==="UserStatusOnline");else if("op3_add_online_users"===$.id)r=s.filter(e=>e.status?.className==="UserStatusOnline");else if("op3_add_admins"===$.id)r=s.filter(e=>e.participant?.className==="ChannelParticipantAdmin");else if("op3_add_premium_users"===$.id)r=s.filter(e=>e.premium);else if("op3_add_recent_joiners"===$.id)r=s.filter(e=>e.participant?.className==="ChannelParticipantRecent"||e.participant?.date);else if("op3_add_by_country"===$.id){let e=String(h.country).toUpperCase(),t={SA:"+966",AE:"+971",EG:"+20",KW:"+965",QA:"+974",BH:"+973",OM:"+968",JO:"+962",LB:"+961",IQ:"+964"};r=s.filter(a=>a.phone&&("+"+a.phone).startsWith(t[e]||"+"+e))}else if("op3_add_by_username_pattern"===$.id){let e=String(h.pattern).toLowerCase();r=s.filter(t=>t.username?.toLowerCase().includes(e))}r=r.slice(0,i);let l=[],c=0,u=0;for(let e of r){try{let i=await m.getInputEntity(e);await m.invoke(new t.Api.channels.InviteToChannel({channel:a,users:[i]})),l.push(`✓ ${e.firstName||e.id} — أُضيف`),c++}catch(a){let t=a.message||String(a);if(t.includes("FLOOD_WAIT")){let e=t.match(/(\d+)/),a=e?parseInt(e[1]):60;l.push(`⛔ FloodWait ${a}s — توقف`),u++;break}l.push(`✗ ${e.firstName||e.id} — ${t.substring(0,40)}`),u++}await new Promise(e=>setTimeout(e,n))}S=`➕ ${$.label} (${r.length} مستخدم):
نجح: ${c} | فشل: ${u}

`+l.join("\n");break}case"op3_multi_target_add":{let e=String(h.userList).split("\n").map(e=>e.trim()).filter(Boolean),a=String(h.targetPeers).split("\n").map(e=>e.trim()).filter(Boolean),i=1e3*Number(h.delay??10),n=[],s=0,r=0;for(let l of e)for(let e of a){try{let a=await o(m,e),i=await m.getInputEntity(l);await m.invoke(new t.Api.channels.InviteToChannel({channel:a,users:[i]})),n.push(`✓ ${l} → ${e}`),s++}catch(t){n.push(`✗ ${l} → ${e}: ${t.message?.substring(0,40)}`),r++}await new Promise(e=>setTimeout(e,i))}S=`🎯 إضافة لعدة قروبات (${e.length} مستخدم \xd7 ${a.length} قروب):
نجح: ${s} | فشل: ${r}

`+n.join("\n");break}case"ramex_clone_group":{let e=await o(m,String(h.sourcePeer)),a=await o(m,String(h.targetPeer)),i=Number(h.limit??100),n=(await m.getParticipants(e,{limit:2*i})).filter(e=>!e.bot&&!e.deleted).slice(0,i),s=[],r=0,c=0;for(let e of n){try{let i=await m.getInputEntity(e);await m.invoke(new t.Api.channels.InviteToChannel({channel:a,users:[i]})),s.push(`✓ ${e.firstName||e.id}`),r++}catch(t){if(t.message?.includes("FLOOD_WAIT")){s.push(`⛔ FloodWait — توقف`),c++;break}s.push(`✗ ${e.firstName||e.id}: ${l(t.message||"")}`),c++}await new Promise(e=>setTimeout(e,8e3))}S=`⚡ استنساخ ${n.length} عضو:
نجح: ${r} | فشل: ${c}

`+s.join("\n");break}case"ramex_incremental_add":{let e=await o(m,String(h.sourcePeer)),a=await o(m,String(h.targetPeer)),i=Number(h.batchSize??5),n=Number(h.intervalMinutes??30),s=Number(h.totalBatches??5),r=(await m.getParticipants(e,{limit:i*s})).filter(e=>!e.bot&&!e.deleted),l=[],c=0,u=0,g=0;for(let e=0;e<s&&g<r.length;e++){l.push(`
📊 الدفعة ${e+1}/${s}:`);for(let e=0;e<i&&g<r.length;e++,g++){let e=r[g];try{let i=await m.getInputEntity(e);await m.invoke(new t.Api.channels.InviteToChannel({channel:a,users:[i]})),l.push(`  ✓ ${e.firstName||e.id}`),c++}catch(t){l.push(`  ✗ ${e.firstName||e.id}: ${t.message?.substring(0,30)}`),u++}await new Promise(e=>setTimeout(e,5e3))}e<s-1&&(l.push(`  ⏸️ انتظار ${n} دقيقة...`),await new Promise(e=>setTimeout(e,60*n*1e3)))}S=`📈 إضافة تدريجية (${s} دفعات \xd7 ${i}):
نجح: ${c} | فشل: ${u}
`+l.join("\n");break}case"ramex_filter_add":{let e=await o(m,String(h.sourcePeer)),a=await o(m,String(h.targetPeer)),i=Number(h.limit??30),n=!0===h.onlyPremium,s=!0===h.onlyWithUsername,r=!1!==h.filterBots,c=!1!==h.filterDeleted,u=await m.getParticipants(e,{limit:5*i}),g=u.filter(e=>(!r||!e.bot)&&(!c||!e.deleted)&&(!n||!!e.premium)&&(!s||!!e.username)).slice(0,i),p=[],w=0,d=0;for(let e of g){try{let i=await m.getInputEntity(e);await m.invoke(new t.Api.channels.InviteToChannel({channel:a,users:[i]})),p.push(`✓ ${e.firstName||e.id}`),w++}catch(t){p.push(`✗ ${e.firstName||e.id}: ${l(t.message||"")}`),d++}await new Promise(e=>setTimeout(e,1e4))}S=`🎛️ إضافة مع تصفية متقدمة:
فلتر: ${g.length} من ${u.length}
نجح: ${w} | فشل: ${d}

`+p.join("\n");break}case"ramex_smart_distribute":{let e=await o(m,String(h.sourcePeer)),a=String(h.targetPeers).split("\n").map(e=>e.trim()).filter(Boolean),i=Number(h.membersPerTarget??10),n=(await m.getParticipants(e,{limit:i*a.length})).filter(e=>!e.bot&&!e.deleted),s=[],r=0,l=0,c=0;for(let e of a)try{let a=await o(m,e);s.push(`
🎯 ${e}:`);for(let e=0;e<i&&c<n.length;e++,c++){let e=n[c];try{let i=await m.getInputEntity(e);await m.invoke(new t.Api.channels.InviteToChannel({channel:a,users:[i]})),s.push(`  ✓ ${e.firstName||e.id}`),r++}catch(t){s.push(`  ✗ ${e.firstName||e.id}: ${t.message?.substring(0,30)}`),l++}await new Promise(e=>setTimeout(e,8e3))}}catch(t){s.push(`✗ فشل حل ${e}: ${t.message}`)}S=`⚖️ توزيع ذكي على ${a.length} قروب \xd7 ${i}:
نجح: ${r} | فشل: ${l}
`+s.join("\n");break}case"ramex_skip_existing":{let e=await o(m,String(h.sourcePeer)),a=await o(m,String(h.targetPeer)),i=Number(h.limit??30),n=await m.getParticipants(a,{limit:5e3}),s=new Set(n.map(e=>String(e.id))),r=(await m.getParticipants(e,{limit:3*i})).filter(e=>!s.has(String(e.id))&&!e.bot&&!e.deleted).slice(0,i),c=[],u=0,g=0;for(let e of r){try{let i=await m.getInputEntity(e);await m.invoke(new t.Api.channels.InviteToChannel({channel:a,users:[i]})),c.push(`✓ ${e.firstName||e.id} (غير موجود مسبقاً)`),u++}catch(t){c.push(`✗ ${e.firstName||e.id}: ${l(t.message||"")}`),g++}await new Promise(e=>setTimeout(e,1e4))}S=`⏭️ تخطي الموجودين:
الموجودون: ${s.size}
الجدد: ${r.length}
نجح: ${u} | فشل: ${g}

`+c.join("\n");break}case"ramex_round_robin":{let e=await o(m,String(h.sourcePeer)),a=await o(m,String(h.targetPeer)),i=Number(h.limit??30),n=(await m.getParticipants(e,{limit:2*i})).filter(e=>!e.bot&&!e.deleted).slice(0,i),s=[],r=0,c=0;for(let e of n){try{let i=await m.getInputEntity(e);await m.invoke(new t.Api.channels.InviteToChannel({channel:a,users:[i]})),s.push(`✓ ${e.firstName||e.id}`),r++}catch(t){s.push(`✗ ${e.firstName||e.id}: ${l(t.message||"")}`),c++}await new Promise(e=>setTimeout(e,12e3))}S=`🔄 Round Robin (حساب واحد):
نجح: ${r} | فشل: ${c}

`+s.join("\n");break}case"ramex_geo_targeted":{let e=await o(m,String(h.sourcePeer)),a=await o(m,String(h.targetPeer)),i=String(h.countries).split(",").map(e=>e.trim().toUpperCase()),n={SA:"+966",AE:"+971",EG:"+20",KW:"+965",QA:"+974",BH:"+973",OM:"+968",JO:"+962",LB:"+961",IQ:"+964"},s=(await m.getParticipants(e,{limit:5e3})).filter(e=>{if(!e.phone)return!1;let t="+"+e.phone;return i.some(e=>t.startsWith(n[e]||"+"+e))}).slice(0,30),r=[],l=0,c=0;for(let e of s){try{let i=await m.getInputEntity(e);await m.invoke(new t.Api.channels.InviteToChannel({channel:a,users:[i]})),r.push(`✓ ${e.firstName||e.id} (${e.phone})`),l++}catch(t){r.push(`✗ ${e.firstName}: ${t.message?.substring(0,30)}`),c++}await new Promise(e=>setTimeout(e,1e4))}S=`🌐 استهداف جغرافي (${i.join(", ")}):
مطابق: ${s.length}
نجح: ${l} | فشل: ${c}

`+r.join("\n");break}case"nearby_find_users":S='⚠️ ميزة Nearby تحتاج صلاحيات الموقع على تطبيق تيليجرام الجوال.\n\nلا يمكن محاكاتها من bot API لكن يمكنك:\n• استخدام "فلترة حسب الدولة" كبديل\n• سحب أعضاء من قروب محلي ثم تصفيتهم حسب رقم الهاتف';break;case"nearby_add_users":S="⚠️ Nearby + Add غير متاح عبر Bot API.\nاستخدم نقل الأعضاء من قروب محلي.";break;case"nearby_country_search":{let e=String(h.country),a=h.targetPeer?String(h.targetPeer):null,i={SA:"+966",AE:"+971",EG:"+20",KW:"+965",QA:"+974",BH:"+973",OM:"+968",JO:"+962",LB:"+961",IQ:"+964",SY:"+963",YE:"+967",PS:"+970",SD:"+249",LY:"+218",TN:"+216",DZ:"+213",MA:"+212",MR:"+222",SO:"+252"},n=await m.getDialogs({limit:500}),s=[];for(let t of n)t.entity?.phone&&("+"+t.entity.phone).startsWith(i[e])&&s.push(t.entity);if(S=`🌍 مستخدمو ${({SA:"السعودية",AE:"الإمارات",EG:"مصر",KW:"الكويت",QA:"قطر",BH:"البحرين",OM:"عمان",JO:"الأردن",LB:"لبنان",IQ:"العراق",SY:"سوريا",YE:"اليمن",PS:"فلسطين",SD:"السودان",LY:"ليبيا",TN:"تونس",DZ:"الجزائر",MA:"المغرب",MR:"موريتانيا",SO:"الصومال"})[e]} (${e}) في محادثاتك:

تم العثور على: ${s.length} مستخدم

`+s.slice(0,50).map(e=>`• +${e.phone} | ${e.firstName||"-"} @${e.username||"-"}`).join("\n"),a&&s.length>0){S+=`

➕ إضافة لـ ${a}...`;let e=await o(m,a),i=0,n=0;for(let a of s.slice(0,20)){try{let n=await m.getInputEntity(a);await m.invoke(new t.Api.channels.InviteToChannel({channel:e,users:[n]})),i++}catch{n++}await new Promise(e=>setTimeout(e,5e3))}S+=`
✓ أُضيف: ${i} | ✗ فشل: ${n}`}break}case"msg_send_text":{let e=await o(m,String(h.peer)),a=await m.sendMessage(e,{message:String(h.message),silent:!0===h.silent,replyTo:h.replyToMsgId?Number(h.replyToMsgId):void 0});!0===h.pin&&await m.invoke(new t.Api.messages.PinMessage({peer:e,id:[a.id]})),S=`✅ تم إرسال الرسالة
Message ID: ${a.id}
`,h.silent&&(S+="(صامت)\n"),h.pin&&(S+="(مثبّتة ✓)\n");break}case"msg_send_media":{let e=await o(m,String(h.peer)),t=String(h.fileUrl),a=h.caption?String(h.caption):void 0;try{let i=await fetch(t),n=await i.arrayBuffer(),s=Buffer.from(n),r=await m.sendFile(e,{file:new CustomFile(t.split("/").pop()||"file",s.length,"",s),caption:a,spoiler:!0===h.asSpoiler});S=`✅ تم إرسال الوسائط
Message ID: ${r.id}`}catch(e){S=`✗ فشل إرسال الوسائط: ${e.message}`}break}case"msg_forward":{let e=await o(m,String(h.fromPeer)),t=await o(m,String(h.toPeer)),a=String(h.msgIds).split(",").map(e=>parseInt(e.trim(),10)).filter(e=>!isNaN(e));await m.forwardMessages(t,a,e),S=`✅ تم توجيه ${a.length} رسالة`;break}case"msg_poll":{let e=await o(m,String(h.peer)),a=String(h.question),i=String(h.options).split("\n").map(e=>e.trim()).filter(Boolean);await m.invoke(new t.Api.messages.SendMedia({peer:e,media:new t.Api.InputMediaPoll({poll:new t.Api.Poll({id:BigInt(Math.floor(1e10*Math.random())),question:a,answers:i.map((e,a)=>new t.Api.PollAnswer({text:e,option:Buffer.from([a])})),multipleChoice:!0===h.multipleAnswers,publicVoters:!0===h.publicVoters,closed:!0===h.closed})}),message:""})),S=`✅ تم إرسال الاستطلاع
السؤال: ${a}
الخيارات: ${i.join(" | ")}`;break}case"report_user":{let e=await o(m,String(h.peer)),a=String(h.reason),i={spam:new t.Api.ReportReasonSpam,fraud:new t.Api.ReportReasonFraud,impersonation:new t.Api.ReportReasonFake,illegal:new t.Api.ReportReasonIllegalDrugs,pornography:new t.Api.ReportReasonChildAbuse,hate:new t.Api.ReportReasonViolence,violence:new t.Api.ReportReasonViolence,child_abuse:new t.Api.ReportReasonChildAbuse,bullying:new t.Api.ReportReasonPersonalDetails,other:new t.Api.ReportReasonOther};await m.invoke(new t.Api.account.ReportPeer({peer:e,reason:i[a]||new t.Api.ReportReasonOther,message:h.comment?String(h.comment):""})),S=`🚩 تم إرسال البلاغ عن المستخدم بنجاح
السبب: ${a}`;break}case"report_message":{let e=await o(m,String(h.peer)),a=Number(h.msgId),i=String(h.reason),n={spam:new t.Api.ReportReasonSpam,fraud:new t.Api.ReportReasonFraud,impersonation:new t.Api.ReportReasonFake,illegal:new t.Api.ReportReasonIllegalDrugs,pornography:new t.Api.ReportReasonChildAbuse,hate:new t.Api.ReportReasonViolence,violence:new t.Api.ReportReasonViolence,child_abuse:new t.Api.ReportReasonChildAbuse,bullying:new t.Api.ReportReasonPersonalDetails,other:new t.Api.ReportReasonOther};await m.invoke(new t.Api.messages.Report({peer:e,id:[a],reason:n[i]||new t.Api.ReportReasonOther,message:""})),S=`🚩 تم إرسال البلاغ عن الرسالة ${a} بنجاح`;break}case"report_channel":{let e=await o(m,String(h.peer)),a=String(h.reason),i={spam:new t.Api.ReportReasonSpam,fraud:new t.Api.ReportReasonFraud,impersonation:new t.Api.ReportReasonFake,illegal:new t.Api.ReportReasonIllegalDrugs,pornography:new t.Api.ReportReasonChildAbuse,violence:new t.Api.ReportReasonViolence,child_abuse:new t.Api.ReportReasonChildAbuse,other:new t.Api.ReportReasonOther};await m.invoke(new t.Api.account.ReportPeer({peer:e,reason:i[a]||new t.Api.ReportReasonOther,message:""})),S=`🚩 تم إرسال البلاغ عن القناة بنجاح`;break}case"report_story":{await o(m,String(h.peer));let e=Number(h.storyId);String(h.reason),S=`🚩 محاولة الإبلاغ عن الستوري ${e}
ملاحظة: الإبلاغ عن الستوري غير متاح عبر Bot API مباشرة.
استخدم الإبلاغ عن المستخدم كحل بديل.`;break}case"group_anti_delete":{let e=await o(m,String(h.groupPeer)),t=(await m.getMessages(e,{limit:100})).filter(e=>e.action?.className==="MessageActionChatDeleteMessage"||e.deleted);S=`🛡️ الرسائل المحذوفة في آخر 100 رسالة:

عدد المحذوفة: ${t.length}

`+t.slice(0,20).map(e=>{let t=new Date(1e3*(e.date||0)).toLocaleString("ar");return`• [${t}] رسالة ${e.id} — حُذفت`}).join("\n");break}case"group_history_cleanup":{let e=String(h.confirm);if("CLEAN"!==e){k=!1,u='التأكيد غير صحيح — اكتب "CLEAN" للتأكيد';break}let t=await o(m,String(h.groupPeer));await m.getMe();let a=(await m.getMessages(t,{fromUser:"me",limit:1e3})).map(e=>e.id);await m.deleteMessages(t,a,{revoke:!0}),S=`🧹 تم حذف ${a.length} رسالة من حسابك في القروب`;break}case"group_member_tracker":{let e=await o(m,String(h.groupPeer)),t=await m.getParticipants(e,{limit:1e3}),a=t.filter(e=>{let t=e.participant?.date;if(!t)return!1;let a=Date.now()/1e3-86400;return t>a}),i=t.filter(e=>e.participant?.className==="ChannelParticipantLeft");S=`👁️ تتبع دخول/خروج آخر 24 ساعة:

✅ انضموا حديثاً: ${a.length}
🚪 غادروا: ${i.length}

المنضمون الجدد:
`+a.slice(0,20).map(e=>`• ${e.firstName||"-"} @${e.username||"-"}`).join("\n");break}case"group_link_converter":{let e=String(h.inviteLink);try{let a=e.replace(/.*\+/,"").replace(/.*joinchat\//,""),i=await m.invoke(new t.Api.messages.CheckChatInvite({hash:a}));S=i.chat?.username?`🔗 تحويل الرابط:

الرابط القديم: ${e}
الرابط المباشر: @${i.chat.username}
https://t.me/${i.chat.username}`:`ℹ️ هذا القروب لا يملك username مباشر.
الرابط الأصلي: ${e}
الاسم: ${i.chat?.title||"غير معروف"}`}catch(e){S=`✗ فشل تحليل الرابط: ${e.message}`}break}case"eng_mass_reactions":{let e=String(h.groups).split("\n").map(e=>e.trim()).filter(Boolean),a=String(h.emoji||"❤️"),i=Number(h.limit??10),n=[],s=0;for(let r of e)try{let e=await o(m,r),l=await m.getMessages(e,{limit:i}),c=0;for(let i of l)try{await m.invoke(new t.Api.messages.SendReaction({peer:e,msgId:i.id,reaction:[new t.Api.ReactionEmoji({emoticon:a})]})),c++}catch{}n.push(`✓ ${r}: ${c}/${l.length} تفاعل`),s+=c}catch(e){n.push(`✗ ${r}: ${e.message?.substring(0,40)}`)}S=`❤️ تفاعلات جماعية (${e.length} قروب \xd7 ${i} رسالة):
إجمالي النجاح: ${s}

`+n.join("\n");break}case"eng_view_stories":{let e=await m.invoke(new t.Api.contacts.GetContacts({})),a=e?.users||[],i=0;for(let e of a.slice(0,Number(h.limit??50))){try{await m.invoke(new t.Api.stories.ReadStories({peer:e.id,maxId:100})),i++}catch{}await new Promise(e=>setTimeout(e,500))}S=`👀 تمت مشاهدة ${i} ستوري من ${a.length} صديق`;break}case"eng_story_reactions":{let e=await o(m,String(h.peer)),a=String(h.emoji||"❤️");try{await m.invoke(new t.Api.stories.SendReaction({peer:e,storyId:1,reaction:new t.Api.ReactionEmoji({emoticon:a})})),S=`✅ تم التفاعل مع ستوري ${e}`}catch(e){S=`⚠️ التفاعل مع الستوري محدود عبر API. رسالة الخطأ: ${e.message?.substring(0,100)}`}break}case"get_profile_photos":{let e=await m.getProfilePhotos("me");S=`🖼️ صور الملف الشخصي (${e.length}):

`+e.map(e=>`• ID: ${e.id} | حجم: ${e.sizes?.length||"?"} نسخ`).join("\n");break}case"change_2fa":{let{password:a}=await e.A(45635),i=await m.invoke(new t.Api.account.GetPassword),n=await a.computeCheck(i,String(h.currentPassword)),s=new t.Api.account.PasswordInputSettings({newAlgo:i.newAlgo,newPasswordHash:await a.computeCheck(i,String(h.newPassword)),hint:h.hint?String(h.hint):void 0});await m.invoke(new t.Api.account.UpdatePasswordSettings({password:n,newSettings:s})),S="✅ تم تغيير كلمة مرور 2FA بنجاح";break}case"enable_2fa":{let{password:a}=await e.A(45635),i=await m.invoke(new t.Api.account.GetPassword);if(i.hasPassword){S="⚠️ 2FA مفعّل بالفعل";break}let n=new t.Api.account.PasswordInputSettings({newAlgo:i.newAlgo,newPasswordHash:await a.computeCheck(i,String(h.password)),hint:h.hint?String(h.hint):void 0});await m.invoke(new t.Api.account.UpdatePasswordSettings({password:new t.Api.InputCheckPasswordEmpty,newSettings:n})),S="✅ تم تفعيل 2FA";break}case"disable_2fa":{let{password:a}=await e.A(45635),i=await m.invoke(new t.Api.account.GetPassword),n=await a.computeCheck(i,String(h.currentPassword));await m.invoke(new t.Api.account.UpdatePasswordSettings({password:n,newSettings:new t.Api.account.PasswordInputSettings({})})),S="⚠️ تم تعطيل 2FA";break}case"get_login_codes":S="🔢 لا يمكن عرض أكواد SMS سابقة عبر Bot API.\nتيليجرام يرسل الأكواد عبر SMS/تطبيق فقط.\nلعرض محاولات الدخول الأخيرة، استخدم /secure-login → الجلسات";break;case"get_full_info":{let e=await m.getMe(),a=await m.invoke(new t.Api.users.GetFullUser({id:new t.Api.InputUserSelf}));S=`📋 المعلومات الكاملة:

`+JSON.stringify({id:String(e.id),first_name:e.firstName||e.first_name,last_name:e.lastName||e.last_name,username:e.username,phone:e.phone,premium:e.premium,status:e.status?.className,full_info:a},null,2).substring(0,5e3);break}case"get_entity_info":{let e=await o(m,String(h.peer)),t=await m.getEntity(e);S=`📋 معلومات الجهة:

`+JSON.stringify(t,null,2).substring(0,3e3);break}case"get_chat_info":{let e=await o(m,String(h.peer)),a=await m.getEntity(e),i=await m.invoke(new t.Api.messages.GetFullChat({chatId:a.id}));S=`ℹ️ معلومات المحادثة:

`+JSON.stringify({name:a.title||a.firstName,username:a.username,id:String(a.id),type:a.className,full:i},null,2).substring(0,5e3);break}case"delete_contact":{let e=String(h.userId),a=await m.getInputEntity(e);await m.invoke(new t.Api.contacts.DeleteContacts({id:[a]})),S=`✅ تم حذف جهة الاتصال`;break}case"send_file":{let e=await o(m,String(h.peer)),t=String(h.fileUrl),a=h.caption?String(h.caption):void 0;try{let i=await fetch(t),n=await i.arrayBuffer(),s=Buffer.from(n),r=await m.sendFile(e,{file:new CustomFile(t.split("/").pop()||"file",s.length,"",s),caption:a});S=`✅ تم إرسال الملف بنجاح
Message ID: ${r.id}`}catch(e){S=`✗ فشل: ${e.message}`}break}case"forward_messages":{let e=await o(m,String(h.fromPeer)),t=await o(m,String(h.toPeer)),a=String(h.messageIds).split(",").map(e=>parseInt(e.trim(),10)).filter(e=>!isNaN(e));await m.forwardMessages(t,a,e),S=`✅ تم توجيه ${a.length} رسالة`;break}case"check_username_available":{let e=String(h.username).replace("@","");try{await m.invoke(new t.Api.account.CheckUsername({username:e})),S=`✅ اسم المستخدم @${e} متاح للتسجيل!`}catch(t){S=`❌ @${e} غير متاح: ${t.message?.substring(0,80)}`}break}case"create_group":await m.invoke(new t.Api.messages.CreateChat({users:[],title:String(h.title)})),S=`✅ تم إنشاء المجموعة: ${h.title}`;break;case"join_group":{let e=String(h.inviteLink).replace(/.*\+/,"").replace(/.*joinchat\//,"");await m.invoke(new t.Api.messages.ImportChatInvite({hash:e})),S=`✅ تم الانضمام للمجموعة`;break}case"leave_group":{let e=await o(m,String(h.groupId));await m.invoke(new t.Api.channels.LeaveChannel({channel:e})),S=`✅ تمت المغادرة`;break}case"get_participants":{let e=await o(m,String(h.groupId)),t=await m.getParticipants(e,{limit:200});S=`👥 أعضاء المجموعة (${t.length}):

`+t.map(e=>`• ${e.firstName||"-"} @${e.username||"-"}`).join("\n");break}case"kick_member":{let e=await o(m,String(h.groupId)),a=await m.getInputEntity(String(h.userId));await m.invoke(new t.Api.channels.EditBanned({channel:e,participant:a,bannedRights:new t.Api.ChatBannedRights({viewMessages:!0,sendMessages:!0,untilDate:0})})),S=`✅ تم طرد العضو`;break}case"promote_admin":{let e=await o(m,String(h.groupId)),a=await m.getInputEntity(String(h.userId));await m.invoke(new t.Api.channels.EditAdmin({channel:e,userId:a,adminRights:new t.Api.ChatAdminRights({changeInfo:!0,postMessages:!0,editMessages:!0,deleteMessages:!0,banUsers:!0,inviteUsers:!0,pinMessages:!0,manageCall:!0}),rank:"admin"})),S=`✅ تمت ترقية العضو لمشرف`;break}case"set_group_title":{let e=await o(m,String(h.groupId));await m.invoke(new t.Api.channels.EditTitle({channel:e,title:String(h.title)})),S=`✅ تم تحديث اسم المجموعة`;break}case"create_channel":await m.invoke(new t.Api.channels.CreateChannel({title:String(h.title),about:h.about?String(h.about):"",megagroup:!0===h.megagroup})),S=`✅ تم إنشاء القناة: ${h.title}`;break;case"join_channel":{let e=await o(m,String(h.channelUsername));await m.invoke(new t.Api.channels.JoinChannel({channel:e})),S=`✅ تم الانضمام للقناة`;break}case"leave_channel":{let e=await o(m,String(h.channelId));await m.invoke(new t.Api.channels.LeaveChannel({channel:e})),S=`✅ تمت مغادرة القناة`;break}case"get_channel_members":{let e=await o(m,String(h.channelId)),t=await m.getParticipants(e,{limit:1e3});S=`📢 عدد المشتركين: ${t.length}`;break}case"mass_promote":{let e=await o(m,String(h.groupPeer)),a=String(h.userList).split("\n").map(e=>e.trim()).filter(Boolean),i=[],n=0,s=0;for(let r of a)try{let a=await m.getInputEntity(r);await m.invoke(new t.Api.channels.EditAdmin({channel:e,userId:a,adminRights:new t.Api.ChatAdminRights({changeInfo:!0,postMessages:!0,editMessages:!0,deleteMessages:!0,banUsers:!0,inviteUsers:!0,pinMessages:!0,manageCall:!0}),rank:"admin"})),i.push(`✓ ${r} — مُرقّى`),n++}catch(e){i.push(`✗ ${r}: ${e.message?.substring(0,40)}`),s++}S=`⬆️ نتائج الترقية:
نجح: ${n} | فشل: ${s}

`+i.join("\n");break}case"mass_pin_messages":{let e=String(h.groups).split("\n").map(e=>e.trim()).filter(Boolean),a=[],i=0,n=0;for(let s of e)try{let e=await o(m,s),n=await m.getMessages(e,{limit:1});n[0]&&(await m.invoke(new t.Api.messages.PinMessage({peer:e,id:[n[0].id]})),a.push(`✓ ${s} — ثُبّت آخر رسالة`),i++)}catch(e){a.push(`✗ ${s}: ${e.message?.substring(0,40)}`),n++}S=`📌 نتائج التثبيت:
نجح: ${i} | فشل: ${n}

`+a.join("\n");break}case"mass_delete_dialogs":{let e=String(h.confirm);if("DELETE"!==e){k=!1,u='التأكيد غير صحيح — اكتب "DELETE"';break}let a=await m.getDialogs({limit:200}),i=0;for(let e of a)try{await m.invoke(new t.Api.messages.DeleteHistory({peer:e.entity,maxId:0,revoke:!0,justClear:!1})),i++}catch{}S=`🗑️ تم حذف ${i} محادثة`;break}case"scrape_private_group":{let e=await o(m,String(h.groupPeer)),t=Number(h.limit??500),a=!1!==h.filterBots,i=!1!==h.filterDeleted,n=await m.getParticipants(e,{limit:t}),s=n.filter(e=>(!a||!e.bot)&&(!i||!e.deleted));S=`🔒 سحب من قروب خاص:

إجمالي: ${n.length} | بعد التصفية: ${s.length}

`+s.slice(0,200).map(e=>{let t=String(e.id).padEnd(17),a=(e.username?"@"+e.username:"-").padEnd(18);return`${t} | ${a} | ${e.firstName||"-"}`}).join("\n");break}case"scrape_from_messages":{let e=await o(m,String(h.groupPeer)),t=Number(h.limit??1e3),a=!1!==h.extractForwards,i=!1!==h.extractReplies,n=await m.getMessages(e,{limit:t}),s=new Set,r=[];for(let e of n){if(a&&e.fwdFrom?.fromId?.userId){let t=String(e.fwdFrom.fromId.userId);s.has(t)||(s.add(t),r.push({id:t,source:"forward"}))}if(i&&e.replyTo?.replyToUserId){let t=String(e.replyTo.replyToUserId);s.has(t)||(s.add(t),r.push({id:t,source:"reply"}))}if(e.senderId){let t=String(e.senderId);s.has(t)||(s.add(t),r.push({id:t,source:"sender"}))}}S=`💬 سحب من ${n.length} رسالة:
مستخدمون فريدون: ${r.length}

`+r.slice(0,200).map(e=>`• ID: ${e.id} (مصدر: ${e.source})`).join("\n");break}case"scrape_deep_members":{let e=await o(m,String(h.groupPeer)),a=Number(h.limit??200),i=!1!==h.includeBio,n=!0===h.includePhotoUrl,s=await m.getParticipants(e,{limit:a});for(let e of(S=`🔍 السحب العميق (${s.length} عضو):

`,s.slice(0,100))){let a=`• ${e.firstName||""} ${e.lastName||""} (ID: ${e.id})`;if(e.username&&(a+=` @${e.username}`),e.premium&&(a+=` ⭐Premium`),e.bot&&(a+=` 🤖Bot`),e.deleted&&(a+=` 💀Deleted`),e.phone&&(a+=` 📱+${e.phone}`),i||n){try{let s=await m.invoke(new t.Api.users.GetFullUser({id:e.id}));i&&s?.fullUser?.about&&(a+=`
  Bio: ${s.fullUser.about.substring(0,100)}`),n&&s?.fullUser?.profilePhoto&&(a+=`
  Photo ID: ${s.fullUser.profilePhoto.photoId}`)}catch{}await new Promise(e=>setTimeout(e,300))}S+=a+"\n"}break}case"scrape_invite_link_members":{let e=await o(m,String(h.groupPeer));try{let a=(await m.invoke(new t.Api.messages.GetChatInviteImporters({peer:e,limit:200,requested:!1}))).importers||[];S=`🔗 مستخدمو رابط الدعوة (${a.length}):

`+a.map(e=>`• ${e.userId} | عبر: ${e.date?new Date(1e3*e.date).toLocaleDateString("ar"):"?"}`).join("\n")}catch(e){S=`⚠️ تحتاج صلاحية مشرف لعرض مستوردي رابط الدعوة.
الخطأ: ${e.message?.substring(0,100)}`}break}case"scrape_message_reactions":{let e=await o(m,String(h.groupPeer)),a=Number(h.msgId);try{let i=await m.invoke(new t.Api.messages.GetMessageReactionsList({peer:e,id:a,limit:100})),n=i?.reactions||[],s=i?.users||[];S=`❤️ المستخدمون المتفاعلون مع رسالة ${a} (${n.length} تفاعل):

`+s.map(e=>`• ${e.firstName||"-"} @${e.username||"-"} (ID: ${e.id})`).join("\n")}catch(e){S=`⚠️ فشل: ${e.message?.substring(0,100)}`}break}case"scrape_message_readers":{let e=await o(m,String(h.channelPeer)),a=Number(h.msgId);try{let i=await m.invoke(new t.Api.messages.GetMessagesViewers({peer:e,msgId:a})),n=i?.users||[];S=`👁️ من قرأ الرسالة ${a} (${n.length}):

`+n.map(e=>`• ${e.firstName||"-"} @${e.username||"-"} (ID: ${e.id})`).join("\n")}catch(e){S=`⚠️ يتطلب صلاحية مشرف في القناة.
الخطأ: ${e.message?.substring(0,100)}`}break}case"scrape_dialogs_users":{let e=Number(h.limit??500),t=!0===h.onlyPrivate,a=!0===h.onlyGroup,i=!0===h.onlyChannel,n=await m.getDialogs({limit:e}),s=n;t&&(s=n.filter(e=>e.isUser)),a&&(s=n.filter(e=>e.isGroup)),i&&(s=n.filter(e=>e.isChannel));let r=[];for(let e of s)!e.entity||e.entity.bot||e.entity.deleted||r.push(e.entity);S=`📥 سحب من ${s.length} محادثة (${r.length} مستخدم):

`+r.slice(0,200).map(e=>`• ${e.firstName||"-"} @${e.username||"-"} (ID: ${e.id})`).join("\n");break}case"add_from_file":{let e=await o(m,String(h.targetPeer)),a=String(h.fileContent||""),i=String(h.fileFormat||"txt"),n=1e3*Number(h.delay??5),s=!1!==h.stopOnFlood,r=[];if("json"===i)try{r=JSON.parse(a).map(e=>String(e))}catch{r=[]}else r="csv1"===i?a.split("\n").map(e=>e.split(",")[0].trim()).filter(Boolean):"csv2"===i?a.split("\n").map(e=>{let t=e.split(",");return t[0]||t[1]||""}).map(e=>e.trim()).filter(Boolean):a.split("\n").map(e=>e.trim()).filter(Boolean);let c=[],u=0,g=0;for(let a of r){try{let i=await m.getInputEntity(a);await m.invoke(new t.Api.channels.InviteToChannel({channel:e,users:[i]})),c.push(`✓ ${a}`),u++}catch(t){let e=t.message||String(t);if(e.includes("FLOOD_WAIT")&&s){let t=e.match(/(\d+)/),a=t?parseInt(t[1],10):60;c.push(`⛔ FloodWait ${a}s — توقف`),g++;break}c.push(`✗ ${a}: ${l(e)}`),g++}await new Promise(e=>setTimeout(e,n))}S=`📄 إضافة من ملف (${i}) — ${r.length} مستخدم:
نجح: ${u} | فشل: ${g}

`+c.join("\n");break}case"add_from_contacts":{let e=await o(m,String(h.targetPeer)),a=Number(h.limit??50),i=1e3*Number(h.delay??5),n=!1!==h.filterNotInGroup,s=await m.invoke(new t.Api.contacts.GetContacts({})),r=(s?.users||[]).filter(e=>!e.bot&&!e.deleted),l=r;if(n)try{let t=await m.getParticipants(e,{limit:5e3}),a=new Set(t.map(e=>String(e.id)));l=r.filter(e=>!a.has(String(e.id)))}catch{}l=l.slice(0,a);let c=[],u=0,g=0;for(let a of l){try{await m.invoke(new t.Api.channels.InviteToChannel({channel:e,users:[new t.Api.InputUser({userId:BigInt(a.id),accessHash:BigInt(a.accessHash)})]})),c.push(`✓ ${a.firstName||a.id}`),u++}catch(e){if(e.message?.includes("FLOOD_WAIT")){c.push(`⛔ FloodWait — توقف`),g++;break}c.push(`✗ ${a.firstName||a.id}: ${e.message?.substring(0,30)}`),g++}await new Promise(e=>setTimeout(e,i))}S=`📇 إضافة من جهات الاتصال (${l.length} من ${r.length}):
نجح: ${u} | فشل: ${g}

`+c.join("\n");break}case"add_from_reactors":{let e=await o(m,String(h.sourcePeer)),a=await o(m,String(h.targetPeer)),i=Number(h.msgId),n=Number(h.limit??30),s=1e3*Number(h.delay??8);try{let r=await m.invoke(new t.Api.messages.GetMessageReactionsList({peer:e,id:i,limit:n})),o=r?.users||[],c=[],u=0,g=0;for(let e of o){try{let i=await m.getInputEntity(e);await m.invoke(new t.Api.channels.InviteToChannel({channel:a,users:[i]})),c.push(`✓ ${e.firstName||e.id}`),u++}catch(t){if(t.message?.includes("FLOOD_WAIT")){c.push(`⛔ FloodWait — توقف`),g++;break}c.push(`✗ ${e.firstName||e.id}: ${l(t.message||"")}`),g++}await new Promise(e=>setTimeout(e,s))}S=`❤️ إضافة من المتفاعلين (${o.length}):
نجح: ${u} | فشل: ${g}

`+c.join("\n")}catch(e){S=`⚠️ فشل جلب المتفاعلين: ${e.message?.substring(0,100)}`}break}case"add_from_readers":{let e=await o(m,String(h.sourcePeer)),a=await o(m,String(h.targetPeer)),i=Number(h.msgId),n=Number(h.limit??20);try{let s=await m.invoke(new t.Api.messages.GetMessagesViewers({peer:e,msgId:i})),r=(s?.users||[]).slice(0,n),o=[],c=0,u=0;for(let e of r){try{let i=await m.getInputEntity(e);await m.invoke(new t.Api.channels.InviteToChannel({channel:a,users:[i]})),o.push(`✓ ${e.firstName||e.id}`),c++}catch(t){o.push(`✗ ${e.firstName||e.id}: ${l(t.message||"")}`),u++}await new Promise(e=>setTimeout(e,8e3))}S=`👁️ إضافة من القرّاء (${r.length}):
نجح: ${c} | فشل: ${u}

`+o.join("\n")}catch(e){S=`⚠️ يتطلب صلاحية مشرف. ${e.message?.substring(0,100)}`}break}case"add_from_dialogs":{let e=await o(m,String(h.targetPeer)),a=Number(h.limit??30),i=1e3*Number(h.delay??10),n=!0===h.filterRecent,s=Date.now()/1e3-604800,r=(await m.getDialogs({limit:500})).filter(e=>e.isUser&&e.entity&&!e.entity.bot&&!e.entity.deleted);n&&(r=r.filter(e=>e.date>s)),r=r.slice(0,a);let l=[],c=0,u=0;for(let a of r){try{let i=await m.getInputEntity(a.entity);await m.invoke(new t.Api.channels.InviteToChannel({channel:e,users:[i]})),l.push(`✓ ${a.entity.firstName||a.entity.id}`),c++}catch(e){if(e.message?.includes("FLOOD_WAIT")){l.push(`⛔ FloodWait — توقف`),u++;break}l.push(`✗ ${a.entity.firstName||a.entity.id}: ${e.message?.substring(0,30)}`),u++}await new Promise(e=>setTimeout(e,i))}S=`💬 إضافة من المحادثات (${r.length}):
نجح: ${c} | فشل: ${u}

`+l.join("\n");break}case"add_from_forward_sources":{let e=await o(m,String(h.sourcePeer)),a=await o(m,String(h.targetPeer)),i=Number(h.limit??20),n=await m.getMessages(e,{limit:500}),s=new Map;for(let e of n)if(e.fwdFrom?.fromId?.userId){let t=String(e.fwdFrom.fromId.userId);s.has(t)||s.set(t,{id:t,count:0}),s.get(t).count++}let r=Array.from(s.values()).slice(0,i),l=[],c=0,u=0;for(let e of r){try{let i=await m.getInputEntity(e.id);await m.invoke(new t.Api.channels.InviteToChannel({channel:a,users:[i]})),l.push(`✓ ${e.id} (توجيه ${e.count}\xd7)`),c++}catch(t){l.push(`✗ ${e.id}: ${t.message?.substring(0,30)}`),u++}await new Promise(e=>setTimeout(e,1e4))}S=`↪️ إضافة من مصادر التوجيه (${r.length}):
نجح: ${c} | فشل: ${u}

`+l.join("\n");break}case"add_from_phone_book":{let e=await o(m,String(h.targetPeer)),a=String(h.phones).split("\n").map(e=>e.trim()).filter(Boolean),i=1e3*Number(h.delay??8),n=a.map((e,a)=>new t.Api.InputPhoneContact({clientId:BigInt(a+1),phone:e,firstName:`Contact ${a+1}`,lastName:""}));try{let s=await m.invoke(new t.Api.contacts.ImportContacts({contacts:n})),r=s?.users||[];if(S=`📞 تم استيراد ${r.length} من ${a.length} رقم

`,r.length>0){let a=[],n=0,s=0;for(let o of r){try{let i=await m.getInputEntity(o);await m.invoke(new t.Api.channels.InviteToChannel({channel:e,users:[i]})),a.push(`✓ +${o.phone} → ${o.firstName||o.id}`),n++}catch(e){a.push(`✗ +${o.phone}: ${e.message?.substring(0,30)}`),s++}await new Promise(e=>setTimeout(e,i))}S+=`إضافة (${r.length}):
نجح: ${n} | فشل: ${s}

`+a.join("\n")}}catch(e){S=`⚠️ فشل استيراد جهات الاتصال: ${e.message?.substring(0,100)}`}break}case"add_mutual_only":{let e=await o(m,String(h.sourcePeer)),a=await o(m,String(h.targetPeer)),i=Number(h.limit??20),n=(await m.getParticipants(e,{limit:1e3})).filter(e=>e.mutualContact).slice(0,i),s=[],r=0,c=0;for(let e of n){try{let i=await m.getInputEntity(e);await m.invoke(new t.Api.channels.InviteToChannel({channel:a,users:[i]})),s.push(`✓ ${e.firstName||e.id} (متبادل)`),r++}catch(t){s.push(`✗ ${e.firstName||e.id}: ${l(t.message||"")}`),c++}await new Promise(e=>setTimeout(e,8e3))}S=`🔄 إضافة المتبادلين فقط (${n.length}):
نجح: ${r} | فشل: ${c}

`+s.join("\n");break}case"auto_responder_setup":{let e=String(h.message),a=!1!==h.onlyPrivate,i=Number(h.durationMinutes??60);await m.invoke(new t.Api.account.UpdateStatus({offline:!0})),S=`🤖 تم إعداد الرد التلقائي:

الرسالة: "${e}"
المدة: ${i} دقيقة
النطاق: ${a?"فقط الرسائل الخاصة":"كل المحادثات"}

⚠️ ملاحظة: الردود التلقائية الكاملة تحتاج Webhook أو polling service. هذا الإعداد يضع الحساب في وضع عدم التواجد.`;break}case"scheduled_message":{let e=await o(m,String(h.peer)),t=String(h.message),a=new Date(String(h.sendAt)),i=new Date,n=a.getTime()-i.getTime();if(n<=0){let a=await m.sendMessage(e,{message:t});S=`✅ تم إرسال الرسالة فوراً (الوقت المحدد قد مضى)
Message ID: ${a.id}`}else n>3e6?S=`⚠️ الجدولة لأكثر من 50 دقيقة غير مدعومة في Vercel.
الوقت المتبقي: ${Math.floor(n/6e4)} دقيقة
استخدم خدمة خارجية مثل Vercel Cron.`:(setTimeout(async()=>{try{await m.sendMessage(e,{message:t})}catch{}},n),S=`⏰ تمت جدولة الرسالة لـ ${a.toLocaleString("ar")}
الوقت المتبقي: ${Math.floor(n/1e3)} ثانية
المستلم: ${h.peer}`);break}case"auto_forward_messages":{let e=await o(m,String(h.sourcePeer)),t=await o(m,String(h.targetPeer)),a=Number(h.limit??50),i=await m.getMessages(e,{limit:a}),n=[],s=0,r=0;for(let a of i){try{await m.forwardMessages(t,[a.id],e),n.push(`✓ رسالة ${a.id}`),s++}catch(e){n.push(`✗ رسالة ${a.id}: ${e.message?.substring(0,30)}`),r++}await new Promise(e=>setTimeout(e,2e3))}S=`↪️ توجيه تلقائي (${i.length}):
نجح: ${s} | فشل: ${r}

`+n.join("\n");break}case"auto_react_messages":{let e=await o(m,String(h.groupPeer)),a=String(h.emoji||"❤️"),i=Number(h.limit??20),n=await m.getMessages(e,{limit:i}),s=0,r=0;for(let i of n){try{await m.invoke(new t.Api.messages.SendReaction({peer:e,msgId:i.id,reaction:[new t.Api.ReactionEmoji({emoticon:a})]})),s++}catch{r++}await new Promise(e=>setTimeout(e,500))}S=`❤️ تفاعل تلقائي (${a}):
نجح: ${s} | فشل: ${r} من ${n.length}`;break}case"auto_welcome_message":{let e=await o(m,String(h.groupPeer)),t=String(h.message),a=(await m.getParticipants(e,{limit:100})).filter(e=>{let t=e.participant?.date;if(!t)return!1;let a=Date.now()/1e3-3600;return t>a}),i=0,n=0;for(let s of a)try{let a=t.replace("{name}",s.firstName||"العضو الجديد");await m.sendMessage(e,{message:a,replyTo:s.participant?.date}),i++}catch{n++}S=`👋 رسائل الترحيب التلقائية:
نجح: ${i} | فشل: ${n} لـ ${a.length} عضو جديد`;break}case"auto_pin_last_message":{let e=String(h.groups).split("\n").map(e=>e.trim()).filter(Boolean),a=[],i=0,n=0;for(let s of e)try{let e=await o(m,s),n=await m.getMessages(e,{limit:1});n[0]&&(await m.invoke(new t.Api.messages.PinMessage({peer:e,id:[n[0].id]})),a.push(`✓ ${s}`),i++)}catch(e){a.push(`✗ ${s}: ${e.message?.substring(0,40)}`),n++}S=`📌 تثبيت تلقائي:
نجح: ${i} | فشل: ${n}

`+a.join("\n");break}case"auto_read_replies":{let e=await m.getDialogs({limit:100}),a=0;for(let i of e)if(i.unreadCount>0)try{await m.invoke(new t.Api.messages.ReadHistory({peer:i.entity,maxId:0})),a++}catch{}S=`✓ تم تعليم ${a} محادثة كمقروءة`;break}case"util_id_resolver":{let e=String(h.input);try{await m.getInputEntity(e);let t=await m.getEntity(e);S=`🔍 تحليل المدخل: "${e}"

النوع: ${t.className}
ID: ${t.id}
`,t.username&&(S+=`Username: @${t.username}
`),t.firstName&&(S+=`الاسم: ${t.firstName} ${t.lastName||""}
`),t.phone&&(S+=`الهاتف: +${t.phone}
`),t.accessHash&&(S+=`Access Hash: ${t.accessHash}
`),S+=`
الرابط: https://t.me/${t.username||"c/"+t.id}`}catch(e){S=`✗ تعذّر تحليل: ${e.message?.substring(0,100)}`}break}case"util_account_health":{let e=await m.getMe(),a=await m.invoke(new t.Api.account.GetPassword),i=await m.invoke(new t.Api.account.GetAuthorizations({})),n=await m.invoke(new t.Api.help.GetConfig),s=await m.getDialogs({});S=`🩺 تقرير صحة الحساب
═══════════════════════════

👤 الحساب:
  • الاسم: ${e.firstName} ${e.lastName||""}
  • @${e.username||"-"}
  • الهاتف: +${e.phone}
  • Premium: ${e.premium?"✅ نعم":"❌ لا"}

🔐 الأمان:
  • 2FA: ${a.hasPassword?"✅ مفعّل":"⚠️ غير مفعّل"}
  • بريد الاستعادة: ${a.email?"✅":"⚠️ غير مُعيّن"}
  • الجلسات النشطة: ${i.authorizations?.length||0}

📊 الإحصائيات:
  • عدد المحادثات: ${s.length}
  • DC: ${n.dcId}
  • إصدار تيليجرام: ${n.version}

💡 التوصيات:
`,a.hasPassword||(S+=`  ⚠️ فعّل 2FA فوراً من /secure-login
`),a.email||(S+=`  ⚠️ أضف بريد استعادة لتفادي فقدان الحساب
`),(i.authorizations?.length||0)>5&&(S+=`  ⚠️ لديك ${i.authorizations?.length} جلسة — راجعها من /secure-login
`),a.hasPassword&&a.email&&5>=(i.authorizations?.length||0)&&(S+=`  ✅ حسابك في حالة جيدة!
`);break}case"util_backup_session":{let e=m.session.save?.()||"",t=await m.getMe(),a={account:{id:String(t.id),first_name:t.firstName,last_name:t.lastName,username:t.username,phone:t.phone,premium:t.premium},session_string:e,backup_date:new Date().toISOString(),version:"1.0"};S=`💾 النسخة الاحتياطية:

${JSON.stringify(a,null,2)}

⚠️ احفظ هذا الملف في مكان آمن — يحتوي على SessionString كاملة!`;break}case"util_multi_account_test":{let e=await a.db.telegramAccount.findMany({where:{ownerId,sessionString:{not:null}},select:{id:!0,phone:!0,fullName:!0,status:!0}});for(let a of(S=`🔄 فحص ${e.length} حساب:

`,e))try{await m.invoke(new t.Api.users.GetFullUser({id:new t.Api.InputUserSelf})),S+=`✅ ${a.phone} — نشط
`}catch(e){S+=`❌ ${a.phone} — ${e.message?.substring(0,50)}
`}break}case"util_chat_history_export":{let e=await o(m,String(h.peer)),t=Number(h.limit??100),a=String(h.format||"json"),i=await m.getMessages(e,{limit:t});if("json"===a){let e=i.map(e=>({id:e.id,date:new Date(1e3*(e.date||0)).toISOString(),from_id:String(e.senderId||""),text:e.message||"",media:e.media?.className||null}));S=JSON.stringify(e,null,2)}else S="csv"===a?"id,date,from_id,text,media\n"+i.map(e=>{let t=new Date(1e3*(e.date||0)).toISOString(),a=(e.message||"").replace(/"/g,'""').replace(/\n/g," ");return`${e.id},${t},${e.senderId||""},"${a}",${e.media?.className||""}`}).join("\n"):i.map(e=>{let t=new Date(1e3*(e.date||0)).toLocaleString("ar");return`[${t}] ${e.senderId?"أنت":"الطرف"}: ${e.message||"[media]"}`}).join("\n");break}case"util_group_link_generator":{let e=String(h.query),a=(await m.invoke(new t.Api.contacts.Search({q:e,limit:Number(h.limit??20)}))).chats||[];S=`🔗 نتائج البحث عن "${e}" (${a.length}):

`+a.map(e=>{let t=e.username?`https://t.me/${e.username}`:"(private)";return`• ${e.title||e.firstName||"?"} — ${t}`}).join("\n");break}case"util_account_statistics":{let e=await m.getMe(),t=await m.getDialogs({}),a=t.filter(e=>e.isGroup),i=t.filter(e=>e.isChannel),n=t.filter(e=>e.isUser),s=t.filter(e=>e.unreadCount>0);S=`📊 إحصائيات الحساب ${e.firstName}
═══════════════════════════

💬 المحادثات: ${t.length}
  • مستخدمون (DMs): ${n.length}
  • مجموعات: ${a.length}
  • قنوات: ${i.length}

📥 غير مقروء: ${s.length} محادثة
  • إجمالي الرسائل غير المقروءة: ${s.reduce((e,t)=>e+t.unreadCount,0)}

👤 معلومات:
  • ID: ${e.id}
  • Premium: ${e.premium?"✅":"❌"}
  • الرقم: +${e.phone}
`;break}default:k=!1,u=`الأمر "${$.label}" ليس منفّذاً بعد — هذا تنفيذ تجريبي`,S=`Command "${d}" is defined but not yet implemented.
Params: ${JSON.stringify(h,null,2)}`}}catch(e){k=!1,u=e.message||String(e),S=""}finally{try{await m.disconnect()}catch{}}let A=Date.now()-b;return await a.db.commandExecution.create({data:{userId:p,accountId:w,commandId:d,commandName:$.label,input:JSON.stringify(h),output:k?S.substring(0,5e3):u||"",status:k?"success":"error",duration:A}}).catch(()=>{}),k&&r.has(d)&&(g=await s({userId:p,accountId:w,commandId:d,commandName:$.label,output:S,sourcePeer:h.groupPeer||h.sourcePeer||h.channelPeer||void 0,format:"export_members_csv"===d?"csv":"txt"}))&&(S+=`

─────────────────────────────────────
📁 تم حفظ النتائج في ملف قابل للتنزيل
   → اذهب لـ /exports لتنزيل الملف
   → معرف الملف: ${g.substring(0,12)}...`),{ok:k,output:S,duration:A,error:u,exportId:g}}e.s(["executeCommand",()=>c])}];

//# sourceMappingURL=src_lib_telegram_command-executor_ts_2d0bc62b._.js.map
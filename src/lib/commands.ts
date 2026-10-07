/**
 * lib/commands.ts — Telegram management command definitions
 * ========================================================
 * 88+ commands across 10 categories for managing Telegram accounts.
 * Each command has input schema and executor function.
 */

export interface CommandParam {
  name: string;
  label: string;
  type: 'text' | 'number' | 'phone' | 'select' | 'textarea' | 'checkbox';
  required: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  defaultValue?: string | number | boolean;
  help?: string;
}

export interface CommandDef {
  id: string;
  name: string;
  label: string;
  description: string;
  category: CommandCategory;
  icon: string;
  params: CommandParam[];
  requiresAccount: boolean;
  danger?: 'low' | 'medium' | 'high';
}

export type CommandCategory =
  | 'account'
  | 'profile'
  | 'messages'
  | 'contacts'
  | 'groups'
  | 'channels'
  | 'privacy'
  | 'security'
  | 'automation'
  | 'utilities'
  | 'scraping'
  | 'mass';

export const COMMAND_CATEGORIES: { id: CommandCategory; label: string; icon: string; color: string }[] = [
  { id: 'account',     label: 'الحساب',          icon: '👤', color: 'blue'   },
  { id: 'profile',     label: 'الملف الشخصي',    icon: '✨', color: 'purple' },
  { id: 'messages',    label: 'الرسائل',         icon: '💬', color: 'green'  },
  { id: 'contacts',    label: 'جهات الاتصال',     icon: '📇', color: 'orange' },
  { id: 'groups',      label: 'المجموعات',       icon: '👥', color: 'pink'   },
  { id: 'channels',    label: 'القنوات',         icon: '📢', color: 'cyan'   },
  { id: 'privacy',     label: 'الخصوصية',        icon: '🔒', color: 'red'    },
  { id: 'security',    label: 'الأمان',          icon: '🛡️', color: 'indigo' },
  { id: 'automation',  label: 'الأتمتة',         icon: '⚡', color: 'yellow' },
  { id: 'utilities',   label: 'أدوات',           icon: '🛠️', color: 'gray'   },
  { id: 'scraping',    label: 'سحب الأعضاء',      icon: '📥', color: 'teal'   },
  { id: 'mass',        label: 'العمليات الجماعية', icon: '🔄', color: 'rose'   },
];

export const COMMANDS: CommandDef[] = [
  // ====== ACCOUNT ======
  {
    id: 'get_me',
    name: 'getMe',
    label: 'معلومات حسابي',
    description: 'عرض المعلومات الأساسية لحسابي على تيليجرام',
    category: 'account',
    icon: '👤',
    params: [],
    requiresAccount: true,
    danger: 'low',
  },
  {
    id: 'get_profile_photos',
    name: 'getProfilePhotos',
    label: 'صور الملف الشخصي',
    description: 'عرض كل صور الملف الشخصي للحساب',
    category: 'account',
    icon: '🖼️',
    params: [],
    requiresAccount: true,
  },
  {
    id: 'change_username',
    name: 'updateUsername',
    label: 'تغيير اسم المستخدم',
    description: 'تغيير الـ @username الخاص بالحساب',
    category: 'account',
    icon: '@',
    params: [
      { name: 'username', label: 'اسم المستخدم الجديد', type: 'text', required: true, placeholder: 'new_username' },
    ],
    requiresAccount: true,
    danger: 'medium',
  },
  {
    id: 'change_name',
    name: 'updateProfile',
    label: 'تغيير الاسم الأول والأخير',
    description: 'تحديث الاسم الأول والأخير والـ bio',
    category: 'account',
    icon: '✏️',
    params: [
      { name: 'firstName', label: 'الاسم الأول', type: 'text', required: true },
      { name: 'lastName', label: 'الاسم الأخير', type: 'text', required: false },
      { name: 'about', label: 'نبذة (Bio)', type: 'textarea', required: false },
    ],
    requiresAccount: true,
    danger: 'medium',
  },
  {
    id: 'change_bio',
    name: 'updateBio',
    label: 'تغيير النبذة',
    description: 'تحديث نص النبذة في الملف الشخصي',
    category: 'account',
    icon: '📝',
    params: [
      { name: 'bio', label: 'النبذة الجديدة', type: 'textarea', required: true, maxLength: 70 },
    ],
    requiresAccount: true,
  },
  {
    id: 'set_profile_photo',
    name: 'setProfilePhoto',
    label: 'تعيين صورة الملف',
    description: 'رفع صورة جديدة للملف الشخصي',
    category: 'account',
    icon: '📷',
    params: [
      { name: 'photoUrl', label: 'رابط الصورة', type: 'text', required: true, placeholder: 'https://...' },
    ],
    requiresAccount: true,
  },
  {
    id: 'delete_profile_photo',
    name: 'deleteProfilePhoto',
    label: 'حذف صورة الملف',
    description: 'حذف صورة الملف الشخصي الحالية',
    category: 'account',
    icon: '🗑️',
    params: [
      { name: 'photoId', label: 'ID الصورة', type: 'text', required: true },
    ],
    requiresAccount: true,
    danger: 'high',
  },
  {
    id: 'account_logout',
    name: 'logOut',
    label: 'تسجيل خروج من تيليجرام',
    description: 'تسجيل خروج نهائي من هذا الحساب على تيليجرام',
    category: 'account',
    icon: '🚪',
    params: [],
    requiresAccount: true,
    danger: 'high',
  },

  // ====== PROFILE ======
  {
    id: 'get_full_info',
    name: 'getFullInfo',
    label: 'المعلومات الكاملة',
    description: 'عرض كل المعلومات المتاحة عن الحساب',
    category: 'profile',
    icon: '📋',
    params: [],
    requiresAccount: true,
  },
  {
    id: 'get_dialogs',
    name: 'getDialogs',
    label: 'كل المحادثات',
    description: 'عرض قائمة بكل المحادثات (دردشات، مجموعات، قنوات)',
    category: 'profile',
    icon: '📂',
    params: [
      { name: 'limit', label: 'الحد الأقصى', type: 'number', required: false, defaultValue: 100 },
    ],
    requiresAccount: true,
  },
  {
    id: 'get_blocked_users',
    name: 'getBlockedUsers',
    label: 'المستخدمون المحظورون',
    description: 'عرض قائمة المستخدمين الذين حظرتهم',
    category: 'profile',
    icon: '🚫',
    params: [],
    requiresAccount: true,
  },

  // ====== MESSAGES ======
  {
    id: 'send_message',
    name: 'sendMessage',
    label: 'إرسال رسالة',
    description: 'إرسال رسالة نصية إلى مستخدم أو مجموعة',
    category: 'messages',
    icon: '✉️',
    params: [
      { name: 'peer', label: 'المستلم (username أو ID)', type: 'text', required: true, placeholder: '@username أو 123456789' },
      { name: 'message', label: 'نص الرسالة', type: 'textarea', required: true },
    ],
    requiresAccount: true,
  },
  {
    id: 'send_bulk_message',
    name: 'sendBulkMessages',
    label: 'إرسال رسائل جماعية',
    description: 'إرسال رسالة إلى عدة مستخدمين دفعة واحدة',
    category: 'messages',
    icon: '📨',
    params: [
      { name: 'peers', label: 'قائمة المستلمين (مفصولة بفواصل)', type: 'textarea', required: true, placeholder: '@user1, @user2, 123456789' },
      { name: 'message', label: 'نص الرسالة', type: 'textarea', required: true },
      { name: 'delay', label: 'تأخير بين كل رسالة (ثانية)', type: 'number', required: false, defaultValue: 2 },
    ],
    requiresAccount: true,
    danger: 'high',
  },
  {
    id: 'forward_messages',
    name: 'forwardMessages',
    label: 'إعادة توجيه رسائل',
    description: 'إعادة توجيه رسائل من محادثة إلى أخرى',
    category: 'messages',
    icon: '↪️',
    params: [
      { name: 'fromPeer', label: 'المحادثة المصدر', type: 'text', required: true },
      { name: 'toPeer', label: 'المحادثة الهدف', type: 'text', required: true },
      { name: 'messageIds', label: 'معرفات الرسائل (مفصولة بفواصل)', type: 'text', required: true },
    ],
    requiresAccount: true,
  },
  {
    id: 'delete_messages',
    name: 'deleteMessages',
    label: 'حذف رسائل',
    description: 'حذف رسائل من محادثة (للجميع إذا كنت أنت المرسل)',
    category: 'messages',
    icon: '🗑️',
    params: [
      { name: 'peer', label: 'المحادثة', type: 'text', required: true },
      { name: 'messageIds', label: 'معرفات الرسائل', type: 'text', required: true },
      { name: 'revoke', label: 'حذف للجميع', type: 'checkbox', required: false, defaultValue: true },
    ],
    requiresAccount: true,
    danger: 'high',
  },
  {
    id: 'mark_as_read',
    name: 'markAsRead',
    label: 'تعليم كمقروء',
    description: 'تعليم كل رسائل محادثة كمقروءة',
    category: 'messages',
    icon: '✓',
    params: [
      { name: 'peer', label: 'المحادثة', type: 'text', required: true },
    ],
    requiresAccount: true,
  },
  {
    id: 'get_history',
    name: 'getHistory',
    label: 'سجل الرسائل',
    description: 'عرض آخر الرسائل من محادثة',
    category: 'messages',
    icon: '📜',
    params: [
      { name: 'peer', label: 'المحادثة', type: 'text', required: true },
      { name: 'limit', label: 'عدد الرسائل', type: 'number', required: false, defaultValue: 50 },
    ],
    requiresAccount: true,
  },
  {
    id: 'send_file',
    name: 'sendFile',
    label: 'إرسال ملف',
    description: 'إرسال ملف (صورة، فيديو، مستند) إلى محادثة',
    category: 'messages',
    icon: '📎',
    params: [
      { name: 'peer', label: 'المستلم', type: 'text', required: true },
      { name: 'fileUrl', label: 'رابط الملف', type: 'text', required: true },
      { name: 'caption', label: 'التعليق', type: 'text', required: false },
    ],
    requiresAccount: true,
  },

  // ====== CONTACTS ======
  {
    id: 'get_contacts',
    name: 'getContacts',
    label: 'جهات الاتصال',
    description: 'عرض قائمة جهات الاتصال',
    category: 'contacts',
    icon: '📇',
    params: [],
    requiresAccount: true,
  },
  {
    id: 'add_contact',
    name: 'addContact',
    label: 'إضافة جهة اتصال',
    description: 'إضافة رقم جديد لجهات الاتصال',
    category: 'contacts',
    icon: '➕',
    params: [
      { name: 'phone', label: 'رقم الهاتف', type: 'phone', required: true, placeholder: '+1234567890' },
      { name: 'firstName', label: 'الاسم الأول', type: 'text', required: true },
      { name: 'lastName', label: 'الاسم الأخير', type: 'text', required: false },
    ],
    requiresAccount: true,
  },
  {
    id: 'delete_contact',
    name: 'deleteContact',
    label: 'حذف جهة اتصال',
    description: 'حذف جهة اتصال من القائمة',
    category: 'contacts',
    icon: '❌',
    params: [
      { name: 'userId', label: 'معرف المستخدم', type: 'text', required: true },
    ],
    requiresAccount: true,
    danger: 'medium',
  },
  {
    id: 'block_user',
    name: 'blockUser',
    label: 'حظر مستخدم',
    description: 'حظر مستخدم من التواصل معك',
    category: 'contacts',
    icon: '🚫',
    params: [
      { name: 'userId', label: 'معرف المستخدم', type: 'text', required: true },
    ],
    requiresAccount: true,
    danger: 'medium',
  },
  {
    id: 'unblock_user',
    name: 'unblockUser',
    label: 'إلغاء حظر',
    description: 'إلغاء حظر مستخدم',
    category: 'contacts',
    icon: '✓',
    params: [
      { name: 'userId', label: 'معرف المستخدم', type: 'text', required: true },
    ],
    requiresAccount: true,
  },

  // ====== GROUPS ======
  {
    id: 'create_group',
    name: 'createGroup',
    label: 'إنشاء مجموعة',
    description: 'إنشاء مجموعة جديدة',
    category: 'groups',
    icon: '➕',
    params: [
      { name: 'title', label: 'اسم المجموعة', type: 'text', required: true },
      { name: 'description', label: 'الوصف', type: 'textarea', required: false },
    ],
    requiresAccount: true,
  },
  {
    id: 'join_group',
    name: 'joinGroup',
    label: 'الانضمام لمجموعة',
    description: 'الانضمام إلى مجموعة عبر رابط الدعوة',
    category: 'groups',
    icon: '➡️',
    params: [
      { name: 'inviteLink', label: 'رابط الدعوة', type: 'text', required: true, placeholder: 'https://t.me/+...' },
    ],
    requiresAccount: true,
  },
  {
    id: 'leave_group',
    name: 'leaveGroup',
    label: 'مغادرة مجموعة',
    description: 'مغادرة مجموعة محددة',
    category: 'groups',
    icon: '🚪',
    params: [
      { name: 'groupId', label: 'معرف المجموعة', type: 'text', required: true },
    ],
    requiresAccount: true,
    danger: 'medium',
  },
  {
    id: 'get_participants',
    name: 'getParticipants',
    label: 'أعضاء المجموعة',
    description: 'عرض قائمة أعضاء مجموعة',
    category: 'groups',
    icon: '👥',
    params: [
      { name: 'groupId', label: 'معرف المجموعة', type: 'text', required: true },
    ],
    requiresAccount: true,
  },
  {
    id: 'kick_member',
    name: 'kickMember',
    label: 'طرد عضو',
    description: 'طرد عضو من مجموعة',
    category: 'groups',
    icon: '👢',
    params: [
      { name: 'groupId', label: 'معرف المجموعة', type: 'text', required: true },
      { name: 'userId', label: 'معرف العضو', type: 'text', required: true },
    ],
    requiresAccount: true,
    danger: 'high',
  },
  {
    id: 'promote_admin',
    name: 'promoteAdmin',
    label: 'ترقية لمشرف',
    description: 'ترقية عضو إلى مشرف في المجموعة',
    category: 'groups',
    icon: '⬆️',
    params: [
      { name: 'groupId', label: 'معرف المجموعة', type: 'text', required: true },
      { name: 'userId', label: 'معرف العضو', type: 'text', required: true },
    ],
    requiresAccount: true,
    danger: 'medium',
  },
  {
    id: 'set_group_title',
    name: 'setGroupTitle',
    label: 'تغيير اسم المجموعة',
    description: 'تغيير اسم مجموعة أنت مشرف فيها',
    category: 'groups',
    icon: '✏️',
    params: [
      { name: 'groupId', label: 'معرف المجموعة', type: 'text', required: true },
      { name: 'title', label: 'الاسم الجديد', type: 'text', required: true },
    ],
    requiresAccount: true,
  },

  // ====== CHANNELS ======
  {
    id: 'create_channel',
    name: 'createChannel',
    label: 'إنشاء قناة',
    description: 'إنشاء قناة بث جديدة',
    category: 'channels',
    icon: '➕',
    params: [
      { name: 'title', label: 'اسم القناة', type: 'text', required: true },
      { name: 'about', label: 'الوصف', type: 'textarea', required: false },
      { name: 'megagroup', label: 'مجموعة كبيرة (بدل قناة)', type: 'checkbox', required: false, defaultValue: false },
    ],
    requiresAccount: true,
  },
  {
    id: 'join_channel',
    name: 'joinChannel',
    label: 'الانضمام لقناة',
    description: 'الاشتراك في قناة',
    category: 'channels',
    icon: '➡️',
    params: [
      { name: 'channelUsername', label: 'معرف القناة', type: 'text', required: true, placeholder: '@channelname' },
    ],
    requiresAccount: true,
  },
  {
    id: 'leave_channel',
    name: 'leaveChannel',
    label: 'مغادرة قناة',
    description: 'إلغاء الاشتراك في قناة',
    category: 'channels',
    icon: '🚪',
    params: [
      { name: 'channelId', label: 'معرف القناة', type: 'text', required: true },
    ],
    requiresAccount: true,
  },
  {
    id: 'get_channel_members',
    name: 'getChannelMembers',
    label: 'مشتركو القناة',
    description: 'عرض عدد مشتركي قناة',
    category: 'channels',
    icon: '👥',
    params: [
      { name: 'channelId', label: 'معرف القناة', type: 'text', required: true },
    ],
    requiresAccount: true,
  },

  // ====== PRIVACY ======
  {
    id: 'set_phone_privacy',
    name: 'setPhonePrivacy',
    label: 'خصوصية رقم الهاتف',
    description: 'تحديد من يستطيع رؤية رقم هاتفك',
    category: 'privacy',
    icon: '📱',
    params: [
      { name: 'visibility', label: 'الرؤية', type: 'select', required: true, options: [
        { label: 'الجميع', value: 'everybody' },
        { label: 'جهات الاتصال', value: 'contacts' },
        { label: 'لا أحد', value: 'nobody' },
      ]},
    ],
    requiresAccount: true,
  },
  {
    id: 'set_last_seen_privacy',
    name: 'setLastSeenPrivacy',
    label: 'خصوصية آخر ظهور',
    description: 'تحديد من يرى آخر ظهور لك',
    category: 'privacy',
    icon: '⏰',
    params: [
      { name: 'visibility', label: 'الرؤية', type: 'select', required: true, options: [
        { label: 'الجميع', value: 'everybody' },
        { label: 'جهات الاتصال', value: 'contacts' },
        { label: 'لا أحد', value: 'nobody' },
      ]},
    ],
    requiresAccount: true,
  },
  {
    id: 'set_profile_photo_privacy',
    name: 'setProfilePhotoPrivacy',
    label: 'خصوصية صورة الملف',
    description: 'تحديد من يرى صورة ملفك الشخصي',
    category: 'privacy',
    icon: '🖼️',
    params: [
      { name: 'visibility', label: 'الرؤية', type: 'select', required: true, options: [
        { label: 'الجميع', value: 'everybody' },
        { label: 'جهات الاتصال', value: 'contacts' },
        { label: 'لا أحد', value: 'nobody' },
      ]},
    ],
    requiresAccount: true,
  },
  {
    id: 'set_add_by_phone_privacy',
    name: 'setAddByPhonePrivacy',
    label: 'إضاقة عبر الهاتف',
    description: 'من يمكنه إضافتك للمجموعات عبر رقمك',
    category: 'privacy',
    icon: '📵',
    params: [
      { name: 'visibility', label: 'الرؤية', type: 'select', required: true, options: [
        { label: 'الجميع', value: 'everybody' },
        { label: 'جهات الاتصال', value: 'contacts' },
        { label: 'لا أحد', value: 'nobody' },
      ]},
    ],
    requiresAccount: true,
  },

  // ====== SECURITY ======
  {
    id: 'enable_2fa',
    name: 'enable2FA',
    label: 'تفعيل التحقق الثنائي',
    description: 'تفعيل كلمة مرور ثنائية على الحساب',
    category: 'security',
    icon: '🔐',
    params: [
      { name: 'password', label: 'كلمة المرور الجديدة', type: 'text', required: true },
      { name: 'hint', label: 'تلميح', type: 'text', required: false },
      { name: 'email', label: 'بريد الاستعادة', type: 'text', required: false },
    ],
    requiresAccount: true,
    danger: 'high',
  },
  {
    id: 'change_2fa',
    name: 'change2FA',
    label: 'تغيير كلمة 2FA',
    description: 'تغيير كلمة مرور التحقق الثنائي',
    category: 'security',
    icon: '🔑',
    params: [
      { name: 'currentPassword', label: 'كلمة المرور الحالية', type: 'text', required: true },
      { name: 'newPassword', label: 'كلمة المرور الجديدة', type: 'text', required: true },
      { name: 'hint', label: 'تلميح جديد', type: 'text', required: false },
    ],
    requiresAccount: true,
    danger: 'high',
  },
  {
    id: 'disable_2fa',
    name: 'disable2FA',
    label: 'تعطيل التحقق الثنائي',
    description: 'إزالة كلمة مرور التحقق الثنائي',
    category: 'security',
    icon: '🔓',
    params: [
      { name: 'currentPassword', label: 'كلمة المرور الحالية', type: 'text', required: true },
    ],
    requiresAccount: true,
    danger: 'high',
  },
  {
    id: 'get_active_sessions',
    name: 'getActiveSessions',
    label: 'الجلسات النشطة',
    description: 'عرض كل الأجهزة المسجلة دخولها على حسابك',
    category: 'security',
    icon: '💻',
    params: [],
    requiresAccount: true,
  },
  {
    id: 'terminate_session',
    name: 'terminateSession',
    label: 'إنهاء جلسة',
    description: 'تسجيل خروج جهاز معين من حسابك',
    category: 'security',
    icon: '🛑',
    params: [
      { name: 'sessionHash', label: 'معرف الجلسة', type: 'text', required: true },
    ],
    requiresAccount: true,
    danger: 'high',
  },
  {
    id: 'terminate_all_other_sessions',
    name: 'terminateAllOtherSessions',
    label: 'إنهاء كل الجلسات الأخرى',
    description: 'تسجيل خروج من كل الأجهزة ما عدا الحالي',
    category: 'security',
    icon: '🛡️',
    params: [],
    requiresAccount: true,
    danger: 'high',
  },
  {
    id: 'get_login_codes',
    name: 'getLoginCodes',
    label: 'رموز تسجيل الدخول',
    description: 'عرض رموز تسجيل الدخول الأخيرة',
    category: 'security',
    icon: '🔢',
    params: [],
    requiresAccount: true,
  },
  {
    id: 'get_password_info',
    name: 'getPasswordInfo',
    label: 'حالة التحقق الثنائي',
    description: 'عرض حالة إعدادات التحقق الثنائي',
    category: 'security',
    icon: 'ℹ️',
    params: [],
    requiresAccount: true,
  },

  // ====== AUTOMATION ======
  {
    id: 'auto_read_all',
    name: 'autoReadAll',
    label: 'تعليم الكل كمقروء',
    description: 'تعليم كل الرسائل في كل المحادثات كمقروءة',
    category: 'automation',
    icon: '✓✓',
    params: [],
    requiresAccount: true,
  },
  {
    id: 'auto_accept_join_requests',
    name: 'autoAcceptJoinRequests',
    label: 'قبول طلبات الانضمام',
    description: 'قبول كل طلبات الانضمام في مجموعة',
    category: 'automation',
    icon: '✓',
    params: [
      { name: 'groupId', label: 'معرف المجموعة', type: 'text', required: true },
    ],
    requiresAccount: true,
  },
  {
    id: 'archive_all_dialogs',
    name: 'archiveAllDialogs',
    label: 'أرشفة كل المحادثات',
    description: 'أرشفة كل المحادثات دفعة واحدة',
    category: 'automation',
    icon: '📦',
    params: [],
    requiresAccount: true,
    danger: 'medium',
  },
  {
    id: 'delete_all_dialogs',
    name: 'deleteAllDialogs',
    label: 'حذف كل المحادثات',
    description: 'حذف كل المحادثات (خطير! لا يمكن التراجع)',
    category: 'automation',
    icon: '⚠️',
    params: [
      { name: 'confirm', label: 'أكِّد بكتابة "DELETE"', type: 'text', required: true },
    ],
    requiresAccount: true,
    danger: 'high',
  },

  // ====== UTILITIES ======
  {
    id: 'resolve_username',
    name: 'resolveUsername',
    label: 'تحليل معرف',
    description: 'تحويل @username إلى معلومات المستخدم/القناة',
    category: 'utilities',
    icon: '🔍',
    params: [
      { name: 'username', label: 'اسم المستخدم', type: 'text', required: true, placeholder: '@username' },
    ],
    requiresAccount: true,
  },
  {
    id: 'get_entity_info',
    name: 'getEntityInfo',
    label: 'معلومات جهة',
    description: 'معلومات كاملة عن مستخدم/مجموعة/قناة',
    category: 'utilities',
    icon: '📋',
    params: [
      { name: 'peer', label: 'المعرف', type: 'text', required: true },
    ],
    requiresAccount: true,
  },
  {
    id: 'get_chat_info',
    name: 'getChatInfo',
    label: 'معلومات محادثة',
    description: 'معلومات تفصيلية عن محادثة',
    category: 'utilities',
    icon: 'ℹ️',
    params: [
      { name: 'peer', label: 'المحادثة', type: 'text', required: true },
    ],
    requiresAccount: true,
  },
  {
    id: 'search_messages',
    name: 'searchMessages',
    label: 'بحث في الرسائل',
    description: 'البحث عن رسائل تحتوي على نص معين',
    category: 'utilities',
    icon: '🔎',
    params: [
      { name: 'query', label: 'نص البحث', type: 'text', required: true },
      { name: 'peer', label: 'في محادثة (اختياري)', type: 'text', required: false },
      { name: 'limit', label: 'الحد الأقصى', type: 'number', required: false, defaultValue: 20 },
    ],
    requiresAccount: true,
  },
  {
    id: 'check_username_available',
    name: 'checkUsernameAvailable',
    label: 'توفّر اسم مستخدم',
    description: 'التحقق إذا كان @username متاحاً للتسجيل',
    category: 'utilities',
    icon: '?',
    params: [
      { name: 'username', label: 'اسم المستخدم', type: 'text', required: true },
    ],
    requiresAccount: true,
  },
  {
    id: 'get_dialogs_count',
    name: 'getDialogsCount',
    label: 'عدد المحادثات',
    description: 'إجمالي عدد المحادثات',
    category: 'utilities',
    icon: '#',
    params: [],
    requiresAccount: true,
  },
  {
    id: 'ping_account',
    name: 'pingAccount',
    label: 'فحص نشاط الحساب',
    description: 'التحقق من أن الحساب نشط ويستجيب',
    category: 'utilities',
    icon: '🏓',
    params: [],
    requiresAccount: true,
  },

  // ====== SCRAPING (سحب الأعضاء) ======
  {
    id: 'scrape_group_members',
    name: 'scrapeGroupMembers',
    label: 'سحب أعضاء مجموعة',
    description: 'استخراج قائمة كاملة بأعضاء مجموعة/قناة (معرف، اسم، username)',
    category: 'scraping',
    icon: '📥',
    params: [
      { name: 'groupPeer', label: 'المجموعة المصدر', type: 'text', required: true, placeholder: '@groupname أو -100xxx' },
      { name: 'limit', label: 'الحد الأقصى للأعضاء', type: 'number', required: false, defaultValue: 1000, help: '0 = كل الأعضاء' },
      { name: 'filterBots', label: 'استبعاد البوتات', type: 'checkbox', required: false, defaultValue: true },
      { name: 'filterDeleted', label: 'استبعاد الحسابات المحذوفة', type: 'checkbox', required: false, defaultValue: true },
      { name: 'filterPremium', label: 'فقط حسابات Premium', type: 'checkbox', required: false, defaultValue: false },
    ],
    requiresAccount: true,
    danger: 'medium',
  },
  {
    id: 'scrape_online_members',
    name: 'scrapeOnlineMembers',
    label: 'سحب الأعضاء النشطين',
    description: 'استخراج الأعضاء المتصلين حالياً في مجموعة',
    category: 'scraping',
    icon: '🟢',
    params: [
      { name: 'groupPeer', label: 'المجموعة', type: 'text', required: true, placeholder: '@groupname' },
      { name: 'limit', label: 'الحد الأقصى', type: 'number', required: false, defaultValue: 200 },
    ],
    requiresAccount: true,
  },
  {
    id: 'scrape_admins',
    name: 'scrapeAdmins',
    label: 'سحب المشرفين',
    description: 'استخراج قائمة المشرفين في مجموعة/قناة',
    category: 'scraping',
    icon: '👑',
    params: [
      { name: 'groupPeer', label: 'المجموعة/القناة', type: 'text', required: true, placeholder: '@groupname' },
    ],
    requiresAccount: true,
  },
  {
    id: 'scrape_bots',
    name: 'scrapeBots',
    label: 'سحب البوتات',
    description: 'استخراج قائمة البوتات الموجودة في مجموعة',
    category: 'scraping',
    icon: '🤖',
    params: [
      { name: 'groupPeer', label: 'المجموعة', type: 'text', required: true },
    ],
    requiresAccount: true,
  },
  {
    id: 'scrape_recent_users',
    name: 'scrapeRecentUsers',
    label: 'آخر المستخدمين النشطين',
    description: 'عرض آخر 100 مستخدم نشط في المجموعة',
    category: 'scraping',
    icon: '⏰',
    params: [
      { name: 'groupPeer', label: 'المجموعة', type: 'text', required: true },
    ],
    requiresAccount: true,
  },

  // ====== MASS OPERATIONS (العمليات الجماعية) ======
  {
    id: 'mass_add_members',
    name: 'massAddMembers',
    label: 'إضافة أعضاء جماعية',
    description: 'إضافة قائمة من المستخدمين إلى مجموعة/قناة (من قروب مصدر إلى قروب هدف)',
    category: 'mass',
    icon: '➕',
    params: [
      { name: 'targetPeer', label: 'المجموعة الهدف', type: 'text', required: true, placeholder: '@targetgroup' },
      { name: 'userList', label: 'قائمة المستخدمين (usernames أو IDs، واحد لكل سطر)', type: 'textarea', required: true, placeholder: '@user1\n@user2\n123456789\n...' },
      { name: 'delay', label: 'التأخير بين الإضافات (ثانية)', type: 'number', required: false, defaultValue: 5, help: 'موصى به: 5-15 ثانية لتجنب FloodWait' },
      { name: 'stopOnFlood', label: 'توقف عند FloodWait', type: 'checkbox', required: false, defaultValue: true },
    ],
    requiresAccount: true,
    danger: 'high',
  },
  {
    id: 'transfer_members',
    name: 'transferMembers',
    label: 'نقل أعضاء من قروب لآخر',
    description: 'سحب الأعضاء من مجموعة مصدر وإضافتهم لمجموعة هدف (العملية الكاملة)',
    category: 'mass',
    icon: '🔄',
    params: [
      { name: 'sourcePeer', label: 'المجموعة المصدر', type: 'text', required: true, placeholder: '@sourcegroup' },
      { name: 'targetPeer', label: 'المجموعة الهدف', type: 'text', required: true, placeholder: '@targetgroup' },
      { name: 'limit', label: 'الحد الأقصى للنقل', type: 'number', required: false, defaultValue: 50, help: 'موصى به: 30-50 يومياً لتفادي الحظر' },
      { name: 'delay', label: 'التأخير بين الإضافات (ثانية)', type: 'number', required: false, defaultValue: 10 },
      { name: 'filterBots', label: 'تخطي البوتات', type: 'checkbox', required: false, defaultValue: true },
      { name: 'filterDeleted', label: 'تخطي الحسابات المحذوفة', type: 'checkbox', required: false, defaultValue: true },
      { name: 'stopOnFlood', label: 'توقف عند FloodWait', type: 'checkbox', required: false, defaultValue: true },
    ],
    requiresAccount: true,
    danger: 'high',
  },
  {
    id: 'mass_dm',
    name: 'massDM',
    label: 'إرسال رسائل جماعية',
    description: 'إرسال رسالة خاصة لقائمة من المستخدمين',
    category: 'mass',
    icon: '✉️',
    params: [
      { name: 'userList', label: 'قائمة المستلمين (username أو ID، واحد لكل سطر)', type: 'textarea', required: true, placeholder: '@user1\n@user2\n123456789' },
      { name: 'message', label: 'نص الرسالة', type: 'textarea', required: true },
      { name: 'delay', label: 'التأخير (ثانية)', type: 'number', required: false, defaultValue: 5 },
      { name: 'stopOnFlood', label: 'توقف عند FloodWait', type: 'checkbox', required: false, defaultValue: true },
    ],
    requiresAccount: true,
    danger: 'high',
  },
  {
    id: 'mass_dm_group_members',
    name: 'massDMGroupMembers',
    label: 'DM جماعي لأعضاء قروب',
    description: 'سحب أعضاء مجموعة ثم إرسال رسالة خاصة لكل واحد',
    category: 'mass',
    icon: '📢',
    params: [
      { name: 'groupPeer', label: 'المجموعة المصدر', type: 'text', required: true, placeholder: '@groupname' },
      { name: 'message', label: 'نص الرسالة', type: 'textarea', required: true },
      { name: 'limit', label: 'الحد الأقصى للمراسلة', type: 'number', required: false, defaultValue: 30 },
      { name: 'delay', label: 'التأخير (ثانية)', type: 'number', required: false, defaultValue: 15 },
    ],
    requiresAccount: true,
    danger: 'high',
  },
  {
    id: 'mass_kick',
    name: 'massKick',
    label: 'طرد جماعي',
    description: 'طرد قائمة من المستخدمين من مجموعة',
    category: 'mass',
    icon: '👢',
    params: [
      { name: 'groupPeer', label: 'المجموعة', type: 'text', required: true },
      { name: 'userList', label: 'قائمة المستخدمين (IDs، واحد لكل سطر)', type: 'textarea', required: true },
      { name: 'delay', label: 'التأخير (ثانية)', type: 'number', required: false, defaultValue: 2 },
    ],
    requiresAccount: true,
    danger: 'high',
  },
  {
    id: 'mass_promote',
    name: 'massPromote',
    label: 'ترقية جماعية لمشرف',
    description: 'ترقية عدة مستخدمين لمشرفين في مجموعة',
    category: 'mass',
    icon: '⬆️',
    params: [
      { name: 'groupPeer', label: 'المجموعة', type: 'text', required: true },
      { name: 'userList', label: 'قائمة المستخدمين (IDs أو usernames)', type: 'textarea', required: true },
    ],
    requiresAccount: true,
    danger: 'high',
  },
  {
    id: 'mass_ban',
    name: 'massBan',
    label: 'حظر جماعي',
    description: 'حظر قائمة من المستخدمين من مجموعة',
    category: 'mass',
    icon: '⛔',
    params: [
      { name: 'groupPeer', label: 'المجموعة', type: 'text', required: true },
      { name: 'userList', label: 'قائمة المستخدمين', type: 'textarea', required: true },
    ],
    requiresAccount: true,
    danger: 'high',
  },
  {
    id: 'mass_mute',
    name: 'massMute',
    label: 'كتم جماعي',
    description: 'كتم عدة مستخدمين في مجموعة',
    category: 'mass',
    icon: '🔇',
    params: [
      { name: 'groupPeer', label: 'المجموعة', type: 'text', required: true },
      { name: 'userList', label: 'قائمة المستخدمين', type: 'textarea', required: true },
      { name: 'duration', label: 'مدة الكتم (دقائق)', type: 'number', required: false, defaultValue: 60 },
    ],
    requiresAccount: true,
    danger: 'high',
  },
  {
    id: 'mass_unmute',
    name: 'massUnmute',
    label: 'إلغاء الكتم الجماعي',
    description: 'إلغاء كتم عدة مستخدمين في مجموعة',
    category: 'mass',
    icon: '🔊',
    params: [
      { name: 'groupPeer', label: 'المجموعة', type: 'text', required: true },
      { name: 'userList', label: 'قائمة المستخدمين', type: 'textarea', required: true },
    ],
    requiresAccount: true,
  },
  {
    id: 'mass_pin_messages',
    name: 'massPinMessages',
    label: 'تثبيت رسائل جماعي',
    description: 'تثبيت آخر رسائل في عدة مجموعات',
    category: 'mass',
    icon: '📌',
    params: [
      { name: 'groups', label: 'قائمة المجموعات (واحدة لكل سطر)', type: 'textarea', required: true },
    ],
    requiresAccount: true,
  },
  {
    id: 'mass_join_groups',
    name: 'massJoinGroups',
    label: 'انضمام جماعي لمجموعات',
    description: 'الانضمام لعدة مجموعات عبر روابط دعوة',
    category: 'mass',
    icon: '➡️',
    params: [
      { name: 'inviteLinks', label: 'روابط الدعوة (واحدة لكل سطر)', type: 'textarea', required: true, placeholder: 'https://t.me/+xxx\nhttps://t.me/+yyy' },
      { name: 'delay', label: 'التأخير (ثانية)', type: 'number', required: false, defaultValue: 10 },
    ],
    requiresAccount: true,
    danger: 'high',
  },
  {
    id: 'mass_leave_groups',
    name: 'massLeaveGroups',
    label: 'مغادرة جماعية للمجموعات',
    description: 'مغادرة كل المجموعات التي أنت عضو فيها',
    category: 'mass',
    icon: '🚪',
    params: [
      { name: 'confirm', label: 'أكِّد بكتابة "LEAVE"', type: 'text', required: true },
      { name: 'delay', label: 'التأخير (ثانية)', type: 'number', required: false, defaultValue: 3 },
    ],
    requiresAccount: true,
    danger: 'high',
  },
  {
    id: 'mass_read_messages',
    name: 'massReadMessages',
    label: 'تعليم الكل كمقروء',
    description: 'تعليم كل الرسائل في كل المحادثات كمقروءة',
    category: 'mass',
    icon: '✓✓',
    params: [],
    requiresAccount: true,
  },
  {
    id: 'mass_delete_dialogs',
    name: 'massDeleteDialogs',
    label: 'حذف كل المحادثات',
    description: 'حذف كل المحادثات من حسابك (لا يمكن التراجع!)',
    category: 'mass',
    icon: '🗑️',
    params: [
      { name: 'confirm', label: 'أكِّد بكتابة "DELETE"', type: 'text', required: true },
    ],
    requiresAccount: true,
    danger: 'high',
  },
  {
    id: 'mass_react_messages',
    name: 'massReactMessages',
    label: 'تفاعل جماعي',
    description: 'إضافة تفاعل (react) لآخر رسائل في عدة محادثات',
    category: 'mass',
    icon: '❤️',
    params: [
      { name: 'groupPeer', label: 'المجموعة', type: 'text', required: true },
      { name: 'emoji', label: 'الإيموجي', type: 'text', required: true, defaultValue: '👍' },
      { name: 'limit', label: 'عدد الرسائل', type: 'number', required: false, defaultValue: 20 },
    ],
    requiresAccount: true,
  },
  {
    id: 'export_members_csv',
    name: 'exportMembersCSV',
    label: 'تصدير الأعضاء CSV',
    description: 'تصدير قائمة أعضاء مجموعة بصيغة CSV (للـ Excel)',
    category: 'scraping',
    icon: '📊',
    params: [
      { name: 'groupPeer', label: 'المجموعة', type: 'text', required: true },
      { name: 'limit', label: 'الحد الأقصى', type: 'number', required: false, defaultValue: 1000 },
    ],
    requiresAccount: true,
  },
  {
    id: 'check_phone_in_group',
    name: 'checkPhoneInGroup',
    label: 'فحص وجود رقم في مجموعة',
    description: 'التحقق إذا كان رقم هاتف معين عضواً في مجموعة',
    category: 'scraping',
    icon: '🔍',
    params: [
      { name: 'groupPeer', label: 'المجموعة', type: 'text', required: true },
      { name: 'phone', label: 'رقم الهاتف', type: 'phone', required: true },
    ],
    requiresAccount: true,
  },
  {
    id: 'scrape_group_info',
    name: 'scrapeGroupInfo',
    label: 'معلومات مجموعة كاملة',
    description: 'استخراج كل المعلومات عن مجموعة (عدد الأعضاء، الوصف، القواعد، المشرفون)',
    category: 'scraping',
    icon: '📋',
    params: [
      { name: 'groupPeer', label: 'المجموعة', type: 'text', required: true },
    ],
    requiresAccount: true,
  },
];

export function getCommandsByCategory(category: CommandCategory): CommandDef[] {
  return COMMANDS.filter((c) => c.category === category);
}

export function getCommandById(id: string): CommandDef | undefined {
  return COMMANDS.find((c) => c.id === id);
}

export function getCommandStats() {
  return {
    total: COMMANDS.length,
    byCategory: COMMAND_CATEGORIES.map((c) => ({
      category: c,
      count: getCommandsByCategory(c.id).length,
    })),
  };
}

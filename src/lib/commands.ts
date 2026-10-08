/**
 * lib/commands.ts — njadder v1.2.1 Command List
 * ==============================================
 * 88 commands in 10 categories
 * Unified Telegram Tool — © NMDDER_DEV
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
  num: string;
  name: string;
  label: string;
  description: string;
  category: CommandCategory;
  icon: string;
  params: CommandParam[];
  requiresAccount: boolean;
  danger?: 'low' | 'medium' | 'high';
  badge?: 'PRO' | 'NEW';
}

export type CommandCategory =
  | 'accounts'
  | 'scrapers'
  | 'filters'
  | 'adders'
  | 'nearby'
  | 'messaging'
  | 'groups'
  | 'reports'
  | 'account_tools'
  | 'utilities';

export const COMMAND_CATEGORIES: { id: CommandCategory; num: string; label: string; labelEn: string; icon: string }[] = [
  { id: 'accounts',      num: '01', label: 'الحسابات',          labelEn: 'Accounts',   icon: '👤' },
  { id: 'scrapers',      num: '02', label: 'أدوات السحب',       labelEn: 'Scrapers',   icon: '📥' },
  { id: 'filters',       num: '03', label: 'الفلاتر',           labelEn: 'Filters',    icon: '🎯' },
  { id: 'adders',        num: '04', label: 'إضافة الأعضاء',      labelEn: 'Adders',     icon: '➕' },
  { id: 'nearby',        num: '05', label: 'الإضافة الجغرافية',  labelEn: 'Nearby',     icon: '📍' },
  { id: 'messaging',     num: '06', label: 'الرسائل',           labelEn: 'Messaging',  icon: '📨' },
  { id: 'groups',        num: '07', label: 'إدارة المجموعات',    labelEn: 'Groups',     icon: '👥' },
  { id: 'reports',       num: '08', label: 'البلاغات',          labelEn: 'Reports',    icon: '🚩' },
  { id: 'account_tools', num: '09', label: 'أدوات الحساب',       labelEn: 'Account Tools', icon: '🔧' },
  { id: 'utilities',     num: '10', label: 'الأدوات المساعدة',    labelEn: 'Utilities',  icon: '🛠️' },
];

export const COMMANDS: CommandDef[] = [
  // ═══════════════════════════════════════════════════════════════
  // 01. الحسابات (Accounts) — 8 أوامر
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'acc_login_all', num: '01', name: 'loginAll',
    label: 'تسجيل دخول الكل',
    description: 'تسجيل دخول لكل الحسابات باستخدام نفس API',
    category: 'accounts', icon: '🔑',
    params: [
      { name: 'phoneCsv', label: 'phone.csv (أرقام الهواتف)', type: 'textarea', required: true, placeholder: '+9665xxxxxxx\n+9665xxxxxxx' },
    ],
    requiresAccount: false,
  },
  {
    id: 'acc_secure_login', num: '02', name: 'secureLogin',
    label: 'دخول آمن — تناوب CSV',
    description: 'تناوب API + جهاز + بروكسي لكل حساب',
    category: 'accounts', icon: '🔐',
    params: [
      { name: 'phoneCsv', label: 'phone.csv', type: 'textarea', required: true },
      { name: 'apiCsv', label: 'api.csv (api_id, api_hash)', type: 'textarea', required: true },
      { name: 'proxiesCsv', label: 'proxies.csv', type: 'textarea', required: false },
    ],
    requiresAccount: false, badge: 'PRO',
  },
  {
    id: 'acc_info_checker', num: '03', name: 'accountInfoChecker',
    label: 'فاحص معلومات الحساب',
    description: 'عرض معلومات الحساب (الاسم، المستخدم، المعرّف، الهاتف، Premium)',
    category: 'accounts', icon: 'ℹ️',
    params: [], requiresAccount: true,
  },
  {
    id: 'acc_otp_viewer', num: '04', name: 'otpViewer',
    label: 'عارض رمز OTP',
    description: 'عرض آخر رمز OTP من المحادثة 777000',
    category: 'accounts', icon: '🔢',
    params: [], requiresAccount: true,
  },
  {
    id: 'acc_filter_banned_live', num: '05', name: 'filterBannedLive',
    label: 'فلترة المحظورين — مباشر',
    description: 'تسجيل دخول فعلي لكل حساب وإزالة المحظورين',
    category: 'accounts', icon: '🚫',
    params: [
      { name: 'mode', label: 'الوضع', type: 'select', required: false, defaultValue: 'live', options: [
        { label: 'LIVE (تسجيل فعلي)', value: 'live' },
        { label: 'STATIC (فحص فقط)', value: 'static' },
      ]},
      { name: 'dryRun', label: 'تشغيل جاف (بدون تعديل)', type: 'checkbox', required: false, defaultValue: false },
    ],
    requiresAccount: true, danger: 'high',
  },
  {
    id: 'acc_remove_non_loggedin', num: '06', name: 'removeNonLoggedin',
    label: 'حذف الحسابات غير المسجّلة',
    description: 'إزالة الحسابات التي فشل تسجيل دخولها',
    category: 'accounts', icon: '🗑️',
    params: [
      { name: 'dryRun', label: 'تشغيل جاف', type: 'checkbox', required: false, defaultValue: true },
    ],
    requiresAccount: false, danger: 'medium',
  },
  {
    id: 'acc_remove_specific', num: '07', name: 'removeSpecific',
    label: 'حذف حساب محدد',
    description: 'حذف حساب محدد من القائمة',
    category: 'accounts', icon: '❌',
    params: [
      { name: 'phone', label: 'رقم الهاتف', type: 'phone', required: true },
    ],
    requiresAccount: false, danger: 'medium',
  },
  {
    id: 'acc_auto_contact_delete', num: '08', name: 'autoContactDelete',
    label: 'حذف جهات الاتصال تلقائياً',
    description: 'حذف كل جهات الاتصال من كل الحسابات',
    category: 'accounts', icon: '📇',
    params: [], requiresAccount: true, danger: 'high',
  },

  // ═══════════════════════════════════════════════════════════════
  // 02. أدوات السحب (Scrapers) — 9 أوامر
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'scr_public', num: '01', name: 'publicScraper',
    label: 'سحب الأعضاء — عام',
    description: 'سحب أعضاء المجموعات العامة (بتوزيع A-Z)',
    category: 'scrapers', icon: '📥',
    params: [
      { name: 'source', label: 'المصدر (@username أو رابط)', type: 'text', required: true, placeholder: '@groupname' },
      { name: 'maxPer', label: 'الحد الأقصى لكل حساب', type: 'number', required: false, defaultValue: 50 },
      { name: 'delay', label: 'التأخير (ثانية)', type: 'number', required: false, defaultValue: 2 },
    ],
    requiresAccount: true,
  },
  {
    id: 'scr_private', num: '02', name: 'privateScraper',
    label: 'سحب — خاص',
    description: 'سحب أعضاء المجموعات الخاصة (عبر رابط الدعوة)',
    category: 'scrapers', icon: '🔒',
    params: [
      { name: 'source', label: 'رابط الدعوة', type: 'text', required: true, placeholder: 'https://t.me/+xxx' },
      { name: 'maxPer', label: 'الحد الأقصى', type: 'number', required: false, defaultValue: 50 },
      { name: 'delay', label: 'التأخير', type: 'number', required: false, defaultValue: 2 },
    ],
    requiresAccount: true, danger: 'medium',
  },
  {
    id: 'scr_hidden', num: '03', name: 'hiddenScraper',
    label: 'سحب الأعضاء المخفية',
    description: 'سحب الأعضاء من سجل المحادثة',
    category: 'scrapers', icon: '👻',
    params: [
      { name: 'source', label: 'المصدر', type: 'text', required: true },
      { name: 'maxPer', label: 'الحد الأقصى', type: 'number', required: false, defaultValue: 50 },
      { name: 'delay', label: 'التأخير', type: 'number', required: false, defaultValue: 2 },
    ],
    requiresAccount: true,
  },
  {
    id: 'scr_private_hidden', num: '04', name: 'privateHiddenScraper',
    label: 'سحب المخفية — خاص',
    description: 'سحب خاص + من السجل مجتمعة',
    category: 'scrapers', icon: '🔒👻',
    params: [
      { name: 'source', label: 'رابط الدعوة', type: 'text', required: true },
      { name: 'maxPer', label: 'الحد الأقصى', type: 'number', required: false, defaultValue: 50 },
      { name: 'delay', label: 'التأخير', type: 'number', required: false, defaultValue: 2 },
    ],
    requiresAccount: true, danger: 'medium',
  },
  {
    id: 'scr_full', num: '05', name: 'fullScraper',
    label: 'السحب الشامل',
    description: 'توزيع A-Z مع حد أعلى لكل حساب',
    category: 'scrapers', icon: '🌐',
    params: [
      { name: 'source', label: 'المصدر', type: 'text', required: true },
      { name: 'maxPer', label: 'الحد الأقصى', type: 'number', required: false, defaultValue: 100 },
      { name: 'delay', label: 'التأخير', type: 'number', required: false, defaultValue: 2 },
    ],
    requiresAccount: true,
  },
  {
    id: 'scr_premium', num: '06', name: 'premiumScraper',
    label: 'سحب الأعضاء المميزين',
    description: 'سحب أعضاء Premium فقط',
    category: 'scrapers', icon: '⭐',
    params: [
      { name: 'source', label: 'المصدر', type: 'text', required: true },
      { name: 'maxPer', label: 'الحد الأقصى', type: 'number', required: false, defaultValue: 50 },
      { name: 'delay', label: 'التأخير', type: 'number', required: false, defaultValue: 2 },
    ],
    requiresAccount: true, badge: 'PRO',
  },
  {
    id: 'scr_filter_csv', num: '07', name: 'filterMembersCsv',
    label: 'فلترة الأعضاء → CSV',
    description: 'كتابة الأعضاء المفلترين إلى CSV',
    category: 'scrapers', icon: '📊',
    params: [
      { name: 'source', label: 'المصدر', type: 'text', required: true },
      { name: 'mode', label: 'نوع الفلتر', type: 'select', required: false, defaultValue: 'all', options: [
        { label: 'الكل', value: 'all' },
        { label: 'نشط يومياً', value: 'daily' },
        { label: 'نشط أسبوعياً', value: 'weekly' },
        { label: 'نشط شهرياً', value: 'monthly' },
        { label: 'متصل الآن', value: 'online' },
        { label: 'خامل', value: 'nonactive' },
        { label: 'مخفي', value: 'hidden' },
      ]},
      { name: 'limit', label: 'الحد الأقصى', type: 'number', required: false, defaultValue: 1000 },
    ],
    requiresAccount: true,
  },
  {
    id: 'scr_add_contacts', num: '08', name: 'scrapeAddContacts',
    label: 'سحب + إضافة كجهات اتصال',
    description: 'سحب مجموعة وإضافة الأعضاء كجهات اتصال',
    category: 'scrapers', icon: '📇➕',
    params: [
      { name: 'source', label: 'المصدر', type: 'text', required: true },
      { name: 'maxPer', label: 'الحد الأقصى', type: 'number', required: false, defaultValue: 50 },
      { name: 'delay', label: 'التأخير', type: 'number', required: false, defaultValue: 2 },
    ],
    requiresAccount: true, danger: 'medium',
  },
  {
    id: 'scr_add_contacts_group', num: '09', name: 'scrapeAddContactsAndGroup',
    label: 'سحب + إضافة جهات ومجموعة',
    description: 'سحب المصدر → إضافة كجهات اتصال وإضافة لمجموعة الهدف',
    category: 'scrapers', icon: '📇👥',
    params: [
      { name: 'source', label: 'المصدر', type: 'text', required: true },
      { name: 'target', label: 'الهدف', type: 'text', required: true },
      { name: 'maxPer', label: 'الحد الأقصى', type: 'number', required: false, defaultValue: 50 },
      { name: 'delay', label: 'التأخير', type: 'number', required: false, defaultValue: 2 },
    ],
    requiresAccount: true, danger: 'high',
  },

  // ═══════════════════════════════════════════════════════════════
  // 03. الفلاتر (Filters) — 8 أوامر
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'flt_daily', num: '01', name: 'dailyActiveAdder',
    label: 'إضافة النشطين يومياً',
    description: 'إضافة الأعضاء النشطين آخر 24 ساعة',
    category: 'filters', icon: '📅',
    params: [
      { name: 'source', label: 'المصدر', type: 'text', required: true },
      { name: 'target', label: 'الهدف', type: 'text', required: true },
      { name: 'maxPer', label: 'الحد الأقصى', type: 'number', required: false, defaultValue: 50 },
      { name: 'delay', label: 'التأخير', type: 'number', required: false, defaultValue: 2 },
    ],
    requiresAccount: true, danger: 'high',
  },
  {
    id: 'flt_weekly', num: '02', name: 'weeklyActiveAdder',
    label: 'إضافة النشطين أسبوعياً',
    description: 'إضافة الأعضاء النشطين آخر 7 أيام',
    category: 'filters', icon: '📆',
    params: [
      { name: 'source', label: 'المصدر', type: 'text', required: true },
      { name: 'target', label: 'الهدف', type: 'text', required: true },
      { name: 'maxPer', label: 'الحد الأقصى', type: 'number', required: false, defaultValue: 50 },
      { name: 'delay', label: 'التأخير', type: 'number', required: false, defaultValue: 2 },
    ],
    requiresAccount: true, danger: 'high',
  },
  {
    id: 'flt_monthly', num: '03', name: 'monthlyActiveAdder',
    label: 'إضافة النشطين شهرياً',
    description: 'إضافة الأعضاء النشطين آخر 30 يوم',
    category: 'filters', icon: '🗓️',
    params: [
      { name: 'source', label: 'المصدر', type: 'text', required: true },
      { name: 'target', label: 'الهدف', type: 'text', required: true },
      { name: 'maxPer', label: 'الحد الأقصى', type: 'number', required: false, defaultValue: 50 },
      { name: 'delay', label: 'التأخير', type: 'number', required: false, defaultValue: 2 },
    ],
    requiresAccount: true, danger: 'high',
  },
  {
    id: 'flt_online', num: '04', name: 'onlineMemberAdder',
    label: 'إضافة المتصلين',
    description: 'إضافة الأعضاء المتصلين حالياً',
    category: 'filters', icon: '🟢',
    params: [
      { name: 'source', label: 'المصدر', type: 'text', required: true },
      { name: 'target', label: 'الهدف', type: 'text', required: true },
      { name: 'maxPer', label: 'الحد الأقصى', type: 'number', required: false, defaultValue: 50 },
      { name: 'delay', label: 'التأخير', type: 'number', required: false, defaultValue: 2 },
    ],
    requiresAccount: true, danger: 'high',
  },
  {
    id: 'flt_nonactive', num: '05', name: 'nonActiveMemberAdder',
    label: 'إضافة الخاملين',
    description: 'إضافة الأعضاء الخاملين',
    category: 'filters', icon: '💤',
    params: [
      { name: 'source', label: 'المصدر', type: 'text', required: true },
      { name: 'target', label: 'الهدف', type: 'text', required: true },
      { name: 'maxPer', label: 'الحد الأقصى', type: 'number', required: false, defaultValue: 50 },
      { name: 'delay', label: 'التأخير', type: 'number', required: false, defaultValue: 2 },
    ],
    requiresAccount: true, danger: 'high',
  },
  {
    id: 'flt_hidden', num: '06', name: 'hiddenMemberAdder',
    label: 'إضافة المخفية',
    description: 'إضافة الأعضاء المخفية (من سجل المحادثة)',
    category: 'filters', icon: '👻',
    params: [
      { name: 'source', label: 'المصدر', type: 'text', required: true },
      { name: 'target', label: 'الهدف', type: 'text', required: true },
      { name: 'maxPer', label: 'الحد الأقصى', type: 'number', required: false, defaultValue: 50 },
      { name: 'delay', label: 'التأخير', type: 'number', required: false, defaultValue: 2 },
    ],
    requiresAccount: true, danger: 'high',
  },
  {
    id: 'flt_single', num: '07', name: 'singleAccountFilterAdder',
    label: 'إضافة بفلتر فردي',
    description: 'اختر حساباً واحداً، أضف الأعضاء بالاسم من data.csv',
    category: 'filters', icon: '👤',
    params: [
      { name: 'target', label: 'الهدف', type: 'text', required: true },
      { name: 'dataCsv', label: 'data.csv (قائمة الأعضاء)', type: 'textarea', required: true, placeholder: '@user1\n@user2\n123456789' },
      { name: 'maxAdds', label: 'الحد الأقصى للإضافة', type: 'number', required: false, defaultValue: 50 },
      { name: 'delay', label: 'التأخير', type: 'number', required: false, defaultValue: 2 },
    ],
    requiresAccount: true, danger: 'high',
  },
  {
    id: 'flt_live_group', num: '08', name: 'liveGroupFilter',
    label: 'فلتر المجموعة المباشر',
    description: 'إزالة صفوف data.csv الموجودة فعلاً في المجموعة الهدف',
    category: 'filters', icon: '🔍',
    params: [
      { name: 'target', label: 'الهدف', type: 'text', required: true },
    ],
    requiresAccount: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // 04. إضافة الأعضاء (Adders) — 6 أوامر
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'add_direct', num: '01', name: 'directAdder',
    label: 'إضافة مباشرة',
    description: 'من المصدر إلى الهدف مباشرة',
    category: 'adders', icon: '➕',
    params: [
      { name: 'source', label: 'المصدر', type: 'text', required: true },
      { name: 'target', label: 'الهدف', type: 'text', required: true },
      { name: 'maxPer', label: 'الحد الأقصى', type: 'number', required: false, defaultValue: 50 },
      { name: 'delay', label: 'التأخير', type: 'number', required: false, defaultValue: 2 },
    ],
    requiresAccount: true, danger: 'high',
  },
  {
    id: 'add_contact_v44', num: '02', name: 'contactAdderV44',
    label: 'إضافة عبر جهات الاتصال',
    description: 'إضافة كجهة اتصال أولاً، ثم للمجموعة (استراتيجية متعددة)',
    category: 'adders', icon: '📇➕',
    params: [
      { name: 'source', label: 'المصدر', type: 'text', required: true },
      { name: 'target', label: 'الهدف', type: 'text', required: true },
      { name: 'maxPer', label: 'الحد الأقصى', type: 'number', required: false, defaultValue: 50 },
      { name: 'delay', label: 'التأخير', type: 'number', required: false, defaultValue: 2 },
    ],
    requiresAccount: true, danger: 'high',
  },
  {
    id: 'add_bulk', num: '03', name: 'bulkAdder',
    label: 'إضافة جماعية',
    description: 'إضافة جهات اتصالك على دفعات للهدف',
    category: 'adders', icon: '📦',
    params: [
      { name: 'target', label: 'الهدف', type: 'text', required: true },
      { name: 'maxPer', label: 'الحد الأقصى', type: 'number', required: false, defaultValue: 50 },
      { name: 'delay', label: 'التأخير', type: 'number', required: false, defaultValue: 2 },
    ],
    requiresAccount: true, danger: 'high',
  },
  {
    id: 'add_file_to_contacts', num: '04', name: 'fileToContacts',
    label: 'data.csv → جهات اتصال',
    description: 'قراءة data.csv → إضافة كجهات اتصال (بدون تكرار)',
    category: 'adders', icon: '📄➡📇',
    params: [
      { name: 'dataCsv', label: 'data.csv', type: 'textarea', required: true, placeholder: '@user1\n@user2\n123456789' },
      { name: 'maxPer', label: 'الحد الأقصى', type: 'number', required: false, defaultValue: 50 },
      { name: 'delay', label: 'التأخير', type: 'number', required: false, defaultValue: 2 },
    ],
    requiresAccount: true, danger: 'medium',
  },
  {
    id: 'add_contacts_to_group', num: '05', name: 'contactsToGroup',
    label: 'جهات اتصال → مجموعة',
    description: 'نقل جهات الاتصال الحالية لمجموعة الهدف',
    category: 'adders', icon: '📇➡👥',
    params: [
      { name: 'target', label: 'الهدف', type: 'text', required: true },
      { name: 'maxPer', label: 'الحد الأقصى', type: 'number', required: false, defaultValue: 50 },
      { name: 'delay', label: 'التأخير', type: 'number', required: false, defaultValue: 2 },
    ],
    requiresAccount: true, danger: 'high',
  },
  {
    id: 'add_ramex', num: '06', name: 'ramexAdder',
    label: 'إضافة Ramex',
    description: 'ساحب ومضيف موحد بـ 7 أوضاع',
    category: 'adders', icon: '⚡',
    params: [
      { name: 'source', label: 'المصدر', type: 'text', required: true },
      { name: 'target', label: 'الهدف', type: 'text', required: true },
      { name: 'maxPer', label: 'الحد الأقصى', type: 'number', required: false, defaultValue: 50 },
      { name: 'delay', label: 'التأخير', type: 'number', required: false, defaultValue: 2 },
      { name: 'mode', label: 'الوضع', type: 'select', required: false, defaultValue: 'all', options: [
        { label: 'الكل', value: 'all' },
        { label: 'مخفي', value: 'hidden' },
        { label: 'نشط يومياً', value: 'daily' },
        { label: 'نشط أسبوعياً', value: 'weekly' },
        { label: 'نشط شهرياً', value: 'monthly' },
        { label: 'متصل', value: 'online' },
        { label: 'خامل', value: 'nonactive' },
      ]},
    ],
    requiresAccount: true, danger: 'high',
  },

  // ═══════════════════════════════════════════════════════════════
  // 05. الإضافة الجغرافية (Nearby) — 3 أوامر
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'nb_auto_detect', num: '01', name: 'autoDetectNearby',
    label: 'كشف تلقائي — 20 دولة',
    description: 'كشف تلقائي للمستخدمين القريبين من 20 دولة',
    category: 'nearby', icon: '🌍',
    params: [
      { name: 'target', label: 'الهدف', type: 'text', required: true },
      { name: 'maxPer', label: 'الحد الأقصى', type: 'number', required: false, defaultValue: 50 },
      { name: 'delay', label: 'التأخير', type: 'number', required: false, defaultValue: 2 },
    ],
    requiresAccount: true, danger: 'high',
  },
  {
    id: 'nb_by_latlong', num: '02', name: 'byLatLong',
    label: 'حسب الإحداثيات',
    description: 'إضافة الجيران حسب خط العرض والطول',
    category: 'nearby', icon: '📍',
    params: [
      { name: 'target', label: 'الهدف', type: 'text', required: true },
      { name: 'lat', label: 'خط العرض', type: 'text', required: true, placeholder: '24.7136' },
      { name: 'lon', label: 'خط الطول', type: 'text', required: true, placeholder: '46.6753' },
      { name: 'maxPer', label: 'الحد الأقصى', type: 'number', required: false, defaultValue: 50 },
      { name: 'delay', label: 'التأخير', type: 'number', required: false, defaultValue: 2 },
    ],
    requiresAccount: true, danger: 'high',
  },
  {
    id: 'nb_by_city', num: '03', name: 'byCity',
    label: 'حسب المدينة',
    description: 'إضافة الجيران حسب اسم المدينة',
    category: 'nearby', icon: '🏙️',
    params: [
      { name: 'target', label: 'الهدف', type: 'text', required: true },
      { name: 'city', label: 'اسم المدينة', type: 'text', required: true, placeholder: 'Riyadh' },
      { name: 'maxPer', label: 'الحد الأقصى', type: 'number', required: false, defaultValue: 50 },
      { name: 'delay', label: 'التأخير', type: 'number', required: false, defaultValue: 2 },
    ],
    requiresAccount: true, danger: 'high',
  },

  // ═══════════════════════════════════════════════════════════════
  // 06. الرسائل (Messaging) — 17 أمر
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'msg_send_group', num: '01', name: 'sendMessageGroup',
    label: 'إرسال رسالة لمجموعة',
    description: 'بث رسالة نصية لمجموعة',
    category: 'messaging', icon: '📨',
    params: [
      { name: 'target', label: 'الهدف', type: 'text', required: true },
      { name: 'message', label: 'الرسالة', type: 'textarea', required: true },
    ],
    requiresAccount: true,
  },
  {
    id: 'msg_send_group_photo', num: '02', name: 'sendMessageGroupPhoto',
    label: 'إرسال رسالة + صورة',
    description: 'بث صورة مع تعليق لمجموعة',
    category: 'messaging', icon: '📨📷',
    params: [
      { name: 'target', label: 'الهدف', type: 'text', required: true },
      { name: 'message', label: 'التعليق', type: 'text', required: true },
      { name: 'photo', label: 'رابط الصورة', type: 'text', required: true },
    ],
    requiresAccount: true,
  },
  {
    id: 'msg_multi_to_one', num: '03', name: 'multiMessageToOneGroup',
    label: 'رسائل متعددة → مجموعة',
    description: 'إرسال عدة رسائل لمجموعة واحدة',
    category: 'messaging', icon: '📨xN',
    params: [
      { name: 'target', label: 'الهدف', type: 'text', required: true },
      { name: 'msgCsv', label: 'message.csv (رسالة لكل سطر)', type: 'textarea', required: true },
      { name: 'perAcct', label: 'إرسالات لكل حساب', type: 'number', required: false, defaultValue: 10 },
    ],
    requiresAccount: true,
  },
  {
    id: 'msg_multi_photo_to_one', num: '04', name: 'multiMessagePhotoToOneGroup',
    label: 'رسائل متعددة + صورة → مجموعة',
    description: 'رسائل متعددة + صورة لمجموعة واحدة',
    category: 'messaging', icon: '📨📷xN',
    params: [
      { name: 'target', label: 'الهدف', type: 'text', required: true },
      { name: 'photo', label: 'رابط الصورة', type: 'text', required: true },
      { name: 'msgCsv', label: 'message.csv', type: 'textarea', required: true },
      { name: 'perAcct', label: 'لكل حساب', type: 'number', required: false, defaultValue: 10 },
      { name: 'delay', label: 'التأخير', type: 'number', required: false, defaultValue: 2 },
    ],
    requiresAccount: true,
  },
  {
    id: 'msg_single_to_multi', num: '05', name: 'singleMessageToMultiGroups',
    label: 'رسالة واحدة → مجموعات',
    description: 'بث رسالة واحدة لعدة مجموعات',
    category: 'messaging', icon: '📨➡👥xN',
    params: [
      { name: 'groupsCsv', label: 'groups.csv (مجموعة لكل سطر)', type: 'textarea', required: true },
      { name: 'message', label: 'الرسالة', type: 'textarea', required: true },
    ],
    requiresAccount: true,
  },
  {
    id: 'msg_multi_to_multi', num: '06', name: 'multiMessageToMultiGroups',
    label: 'رسائل متعددة → مجموعات',
    description: 'بث متعدد الرسائل عبر عدة مجموعات',
    category: 'messaging', icon: '📨xN➡👥xN',
    params: [
      { name: 'groupsCsv', label: 'groups.csv', type: 'textarea', required: true },
      { name: 'msgCsv', label: 'message.csv', type: 'textarea', required: true },
      { name: 'perAcct', label: 'لكل حساب', type: 'number', required: false, defaultValue: 10 },
    ],
    requiresAccount: true,
  },
  {
    id: 'msg_multi_photo_to_multi', num: '07', name: 'multiMessagePhotoToMultiGroups',
    label: 'رسائل + صورة → مجموعات',
    description: 'رسائل متعددة + صورة عبر عدة مجموعات',
    category: 'messaging', icon: '📨📷➡👥xN',
    params: [
      { name: 'groupsCsv', label: 'groups.csv', type: 'textarea', required: true },
      { name: 'photo', label: 'رابط الصورة', type: 'text', required: true },
      { name: 'msgCsv', label: 'message.csv', type: 'textarea', required: true },
      { name: 'perAcct', label: 'لكل حساب', type: 'number', required: false, defaultValue: 10 },
      { name: 'delay', label: 'التأخير', type: 'number', required: false, defaultValue: 2 },
    ],
    requiresAccount: true,
  },
  {
    id: 'msg_fwd_with_tag', num: '08', name: 'forwardWithTag',
    label: 'إعادة توجيه — مع تاج',
    description: 'إعادة توجيه منشورات المصدر مع تاج المرسل',
    category: 'messaging', icon: '↪️',
    params: [
      { name: 'source', label: 'المصدر', type: 'text', required: true },
      { name: 'targets', label: 'الأهداف (مفصولة بفواصل)', type: 'text', required: true },
    ],
    requiresAccount: true,
  },
  {
    id: 'msg_fwd_no_tag', num: '09', name: 'forwardWithoutTag',
    label: 'إعادة توجيه — بدون تاج',
    description: 'نسخ مجهول — إعادة توجيه بدون تاج المرسل',
    category: 'messaging', icon: '↪️🔇',
    params: [
      { name: 'source', label: 'المصدر', type: 'text', required: true },
      { name: 'targets', label: 'الأهداف', type: 'text', required: true },
    ],
    requiresAccount: true,
  },
  {
    id: 'msg_send_dm', num: '10', name: 'sendDM',
    label: 'إرسال رسالة خاصة',
    description: 'إرسال رسالة خاصة لمستخدم واحد',
    category: 'messaging', icon: '✉️',
    params: [
      { name: 'username', label: 'المستخدم', type: 'text', required: true, placeholder: '@username' },
      { name: 'message', label: 'الرسالة', type: 'textarea', required: true },
    ],
    requiresAccount: true,
  },
  {
    id: 'msg_send_dm_photo', num: '11', name: 'sendDMPhoto',
    label: 'إرسال خاص + صورة',
    description: 'إرسال خاص مع صورة لمستخدم واحد',
    category: 'messaging', icon: '✉️📷',
    params: [
      { name: 'username', label: 'المستخدم', type: 'text', required: true },
      { name: 'message', label: 'الرسالة', type: 'text', required: true },
      { name: 'photo', label: 'رابط الصورة', type: 'text', required: true },
    ],
    requiresAccount: true,
  },
  {
    id: 'msg_dm_all', num: '12', name: 'dmAllInDataCsv',
    label: 'DM لكل data.csv',
    description: 'إرسال DM لكل المستخدمين في data.csv',
    category: 'messaging', icon: '✉️xN',
    params: [
      { name: 'message', label: 'الرسالة', type: 'textarea', required: true },
      { name: 'maxPer', label: 'الحد الأقصى', type: 'number', required: false, defaultValue: 50 },
      { name: 'delay', label: 'التأخير', type: 'number', required: false, defaultValue: 5 },
    ],
    requiresAccount: true, danger: 'high',
  },
  {
    id: 'msg_dm_all_photo', num: '13', name: 'dmAllPhotoInDataCsv',
    label: 'DM + صورة لكل data.csv',
    description: 'إرسال DM مع صورة لكل المستخدمين في data.csv',
    category: 'messaging', icon: '✉️📷xN',
    params: [
      { name: 'message', label: 'الرسالة', type: 'textarea', required: true },
      { name: 'photo', label: 'رابط الصورة', type: 'text', required: true },
      { name: 'maxPer', label: 'الحد الأقصى', type: 'number', required: false, defaultValue: 50 },
      { name: 'delay', label: 'التأخير', type: 'number', required: false, defaultValue: 5 },
    ],
    requiresAccount: true, danger: 'high',
  },
  {
    id: 'msg_ramex_sender', num: '14', name: 'ramexSender',
    label: 'مرسل Ramex',
    description: 'سحب مجموعة المصدر + إرسال DM لكل عضو',
    category: 'messaging', icon: '⚡✉️',
    params: [
      { name: 'source', label: 'المصدر', type: 'text', required: true },
      { name: 'message', label: 'الرسالة', type: 'textarea', required: true },
      { name: 'maxPer', label: 'الحد الأقصى', type: 'number', required: false, defaultValue: 30 },
      { name: 'delay', label: 'التأخير', type: 'number', required: false, defaultValue: 10 },
    ],
    requiresAccount: true, danger: 'high',
  },
  {
    id: 'msg_single_acct_msg', num: '15', name: 'singleAcctMessageN',
    label: 'حساب واحد: رسالة → مجموعة (N نسخ)',
    description: 'حساب واحد يرسل N نسخ لمجموعة واحدة',
    category: 'messaging', icon: '👤📨xN',
    params: [
      { name: 'target', label: 'الهدف', type: 'text', required: true },
      { name: 'message', label: 'الرسالة', type: 'textarea', required: true },
      { name: 'nSends', label: 'عدد النسخ', type: 'number', required: false, defaultValue: 5 },
      { name: 'delay', label: 'التأخير', type: 'number', required: false, defaultValue: 2 },
    ],
    requiresAccount: true,
  },
  {
    id: 'msg_single_acct_photo', num: '16', name: 'singleAcctPhotoN',
    label: 'حساب واحد: صورة → مجموعة (N نسخ)',
    description: 'حساب واحد يرسل N نسخ صورة لمجموعة',
    category: 'messaging', icon: '👤📷xN',
    params: [
      { name: 'target', label: 'الهدف', type: 'text', required: true },
      { name: 'photo', label: 'رابط الصورة', type: 'text', required: true },
      { name: 'caption', label: 'التعليق', type: 'text', required: true },
      { name: 'nSends', label: 'عدد النسخ', type: 'number', required: false, defaultValue: 5 },
      { name: 'delay', label: 'التأخير', type: 'number', required: false, defaultValue: 2 },
    ],
    requiresAccount: true,
  },
  {
    id: 'msg_single_acct_multi', num: '17', name: 'singleAcctPhotoToMultiGroups',
    label: 'حساب واحد: صورة → مجموعات',
    description: 'حساب واحد يرسل صورة لعدة مجموعات',
    category: 'messaging', icon: '👤📷➡👥xN',
    params: [
      { name: 'groupsCsv', label: 'groups.csv', type: 'textarea', required: true },
      { name: 'photo', label: 'رابط الصورة', type: 'text', required: true },
      { name: 'caption', label: 'التعليق', type: 'text', required: true },
      { name: 'delay', label: 'التأخير', type: 'number', required: false, defaultValue: 2 },
    ],
    requiresAccount: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // 07. إدارة المجموعات (Groups) — 4 أوامر
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'grp_join_one', num: '01', name: 'joinOneGroup',
    label: 'انضمام لمجموعة — للكل',
    description: 'انضمام جماعي لمجموعة واحدة من كل الحسابات',
    category: 'groups', icon: '➡️👥',
    params: [
      { name: 'group', label: 'المجموعة', type: 'text', required: true },
    ],
    requiresAccount: true, danger: 'medium',
  },
  {
    id: 'grp_join_csv', num: '02', name: 'joinGroupsFromCsv',
    label: 'انضمام من CSV',
    description: 'انضمام جماعي لعدة مجموعات من groups.csv',
    category: 'groups', icon: '📄➡️👥',
    params: [
      { name: 'groupsCsv', label: 'groups.csv', type: 'textarea', required: true },
    ],
    requiresAccount: true, danger: 'medium',
  },
  {
    id: 'grp_leave_one', num: '03', name: 'leaveOneGroup',
    label: 'مغادرة مجموعة — للكل',
    description: 'مغادرة جماعية لمجموعة واحدة من كل الحسابات',
    category: 'groups', icon: '🚪👥',
    params: [
      { name: 'group', label: 'المجموعة', type: 'text', required: true },
    ],
    requiresAccount: true, danger: 'medium',
  },
  {
    id: 'grp_leave_csv', num: '04', name: 'leaveGroupsFromCsv',
    label: 'مغادرة من CSV',
    description: 'مغادرة جماعية لعدة مجموعات من groups.csv',
    category: 'groups', icon: '📄🚪👥',
    params: [
      { name: 'groupsCsv', label: 'groups.csv', type: 'textarea', required: true },
    ],
    requiresAccount: true, danger: 'high',
  },

  // ═══════════════════════════════════════════════════════════════
  // 08. البلاغات (Reports) — 12 أمر
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'rpt_fake', num: '01', name: 'reportFake',
    label: 'بلاغ: وهمي',
    description: 'بلاغ: محتوى وهمي/انتحال',
    category: 'reports', icon: '🚩',
    params: [
      { name: 'channel', label: 'القناة', type: 'text', required: true },
      { name: 'postId', label: 'معرف المنشور', type: 'number', required: true },
    ],
    requiresAccount: true, danger: 'high',
  },
  {
    id: 'rpt_spam', num: '02', name: 'reportSpam',
    label: 'بلاغ: سبام',
    description: 'بلاغ: محتوى سبام',
    category: 'reports', icon: '🚩',
    params: [
      { name: 'channel', label: 'القناة', type: 'text', required: true },
      { name: 'postId', label: 'معرف المنشور', type: 'number', required: true },
    ],
    requiresAccount: true, danger: 'high',
  },
  {
    id: 'rpt_violence', num: '03', name: 'reportViolence',
    label: 'بلاغ: عنف',
    description: 'بلاغ: محتوى عنيف',
    category: 'reports', icon: '🚩',
    params: [
      { name: 'channel', label: 'القناة', type: 'text', required: true },
      { name: 'postId', label: 'معرف المنشور', type: 'number', required: true },
    ],
    requiresAccount: true, danger: 'high',
  },
  {
    id: 'rpt_child', num: '04', name: 'reportChildAbuse',
    label: 'بلاغ: إساءة أطفال',
    description: 'بلاغ: إساءة أطفال',
    category: 'reports', icon: '🚩',
    params: [
      { name: 'channel', label: 'القناة', type: 'text', required: true },
      { name: 'postId', label: 'معرف المنشور', type: 'number', required: true },
    ],
    requiresAccount: true, danger: 'high',
  },
  {
    id: 'rpt_copyright', num: '05', name: 'reportCopyright',
    label: 'بلاغ: حقوق نشر',
    description: 'بلاغ: انتهاك حقوق نشر',
    category: 'reports', icon: '🚩',
    params: [
      { name: 'channel', label: 'القناة', type: 'text', required: true },
      { name: 'postId', label: 'معرف المنشور', type: 'number', required: true },
    ],
    requiresAccount: true, danger: 'high',
  },
  {
    id: 'rpt_geo', num: '06', name: 'reportGeo',
    label: 'بلاغ: جغرافي',
    description: 'بلاغ: محتوى غير ذي صلة جغرافياً',
    category: 'reports', icon: '🚩',
    params: [
      { name: 'channel', label: 'القناة', type: 'text', required: true },
      { name: 'postId', label: 'معرف المنشور', type: 'number', required: true },
    ],
    requiresAccount: true, danger: 'high',
  },
  {
    id: 'rpt_personal', num: '07', name: 'reportPersonalDetails',
    label: 'بلاغ: تفاصيل شخصية',
    description: 'بلاغ: كشف تفاصيل شخصية',
    category: 'reports', icon: '🚩',
    params: [
      { name: 'channel', label: 'القناة', type: 'text', required: true },
      { name: 'postId', label: 'معرف المنشور', type: 'number', required: true },
    ],
    requiresAccount: true, danger: 'high',
  },
  {
    id: 'rpt_drugs', num: '08', name: 'reportDrugs',
    label: 'بلاغ: مخدرات',
    description: 'بلاغ: محتوى مخدرات',
    category: 'reports', icon: '🚩',
    params: [
      { name: 'channel', label: 'القناة', type: 'text', required: true },
      { name: 'postId', label: 'معرف المنشور', type: 'number', required: true },
    ],
    requiresAccount: true, danger: 'high',
  },
  {
    id: 'rpt_porn', num: '09', name: 'reportPorn',
    label: 'بلاغ: إباحية',
    description: 'بلاغ: محتوى إباحي',
    category: 'reports', icon: '🚩',
    params: [
      { name: 'channel', label: 'القناة', type: 'text', required: true },
      { name: 'postId', label: 'معرف المنشور', type: 'number', required: true },
    ],
    requiresAccount: true, danger: 'high',
  },
  {
    id: 'rpt_other', num: '10', name: 'reportOther',
    label: 'بلاغ: أخرى',
    description: 'بلاغ: سبب آخر',
    category: 'reports', icon: '🚩',
    params: [
      { name: 'channel', label: 'القناة', type: 'text', required: true },
      { name: 'postId', label: 'معرف المنشور', type: 'number', required: true },
    ],
    requiresAccount: true, danger: 'high',
  },
  {
    id: 'rpt_user', num: '11', name: 'reportUser',
    label: 'بلاغ عن مستخدم',
    description: 'الإبلاغ عن حساب مستخدم بالاسم',
    category: 'reports', icon: '🚩👤',
    params: [
      { name: 'username', label: 'المستخدم', type: 'text', required: true },
      { name: 'reason', label: 'السبب', type: 'select', required: true, options: [
        { label: 'وهمي', value: 'fake' }, { label: 'سبام', value: 'spam' },
        { label: 'عنف', value: 'violence' }, { label: 'أطفال', value: 'child' },
        { label: 'حقوق نشر', value: 'copyright' }, { label: 'أخرى', value: 'other' },
      ]},
      { name: 'msg', label: 'تفاصيل إضافية', type: 'textarea', required: false },
    ],
    requiresAccount: true, danger: 'high',
  },
  {
    id: 'rpt_scam', num: '12', name: 'sendScamReport',
    label: 'بلاغ احتيال → @notoscam',
    description: 'إرسال بلاغ احتيال إلى @notoscam',
    category: 'reports', icon: '🚩💰',
    params: [
      { name: 'message', label: 'تفاصيل البلاغ', type: 'textarea', required: true },
    ],
    requiresAccount: true, danger: 'high',
  },

  // ═══════════════════════════════════════════════════════════════
  // 09. أدوات الحساب (Account Tools) — 8 أوامر
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'tool_change_name', num: '01', name: 'changeNameBio',
    label: 'تغيير الاسم والنبذة',
    description: 'تحديث الاسم الأول والأخير والنبذة لكل الحسابات',
    category: 'account_tools', icon: '✏️',
    params: [
      { name: 'firstname', label: 'الاسم الأول', type: 'text', required: true },
      { name: 'lastname', label: 'الاسم الأخير', type: 'text', required: false },
      { name: 'bio', label: 'النبذة', type: 'textarea', required: false },
    ],
    requiresAccount: true,
  },
  {
    id: 'tool_random_name', num: '02', name: 'setRandomName',
    label: 'ضبط اسم عشوائي واقعي',
    description: 'ضبط أسماء واقعية (ولد/بنت) لكل الحسابات',
    category: 'account_tools', icon: '🎲',
    params: [
      { name: 'gender', label: 'الجنس', type: 'select', required: false, defaultValue: 'any', options: [
        { label: 'أي', value: 'any' }, { label: 'ولد', value: 'boy' }, { label: 'بنت', value: 'girl' },
      ]},
      { name: 'unique', label: 'أسماء فريدة', type: 'checkbox', required: false, defaultValue: true },
    ],
    requiresAccount: true,
  },
  {
    id: 'tool_set_photo', num: '03', name: 'setProfilePic',
    label: 'ضبط صورة الحساب',
    description: 'ضبط صورة الحساب لكل الحسابات',
    category: 'account_tools', icon: '📷',
    params: [
      { name: 'photo', label: 'رابط الصورة', type: 'text', required: true },
    ],
    requiresAccount: true,
  },
  {
    id: 'tool_del_photo', num: '04', name: 'removeProfilePic',
    label: 'حذف صورة الحساب',
    description: 'حذف صورة الحساب من كل الحسابات',
    category: 'account_tools', icon: '🗑️📷',
    params: [], requiresAccount: true, danger: 'medium',
  },
  {
    id: 'tool_set_username', num: '05', name: 'setUsername',
    label: 'ضبط اسم المستخدم — للكل',
    description: 'ضبط نفس اسم المستخدم لكل الحسابات',
    category: 'account_tools', icon: '@',
    params: [
      { name: 'username', label: 'اسم المستخدم (8+ حرف)', type: 'text', required: true },
    ],
    requiresAccount: true,
  },
  {
    id: 'tool_set_username_csv', num: '06', name: 'setUsernamesFromCsv',
    label: 'ضبط الأسماء من CSV',
    description: 'ضبط أسماء مستخدم فريدة لكل حساب من username.csv',
    category: 'account_tools', icon: '📄@',
    params: [
      { name: 'csv', label: 'username.csv', type: 'textarea', required: true },
    ],
    requiresAccount: true,
  },
  {
    id: 'tool_gen_usernames', num: '07', name: 'generateRandomUsernames',
    label: 'توليد أسماء عشوائية',
    description: 'توليد N أسماء عشوائية',
    category: 'account_tools', icon: '🎲@',
    params: [
      { name: 'count', label: 'العدد', type: 'number', required: false, defaultValue: 10 },
      { name: 'length', label: 'الطول', type: 'number', required: false, defaultValue: 8 },
    ],
    requiresAccount: false,
  },
  {
    id: 'tool_enable_2fa', num: '08', name: 'enable2FA',
    label: 'تفعيل التحقق بخطوتين',
    description: 'ضبط كلمة مرور 2FA (8+ حرف) لكل الحسابات',
    category: 'account_tools', icon: '🔐',
    params: [
      { name: 'newPwd', label: 'كلمة المرور الجديدة (8+ حرف)', type: 'text', required: true },
      { name: 'curPwd', label: 'كلمة المرور الحالية (إن وجدت)', type: 'text', required: false },
    ],
    requiresAccount: true, danger: 'high',
  },

  // ═══════════════════════════════════════════════════════════════
  // 10. الأدوات المساعدة (Utilities) — 13 أمر
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'util_csv_blank', num: '01', name: 'csvBlankRemover',
    label: 'حاذف الأسطر الفارغة',
    description: 'إزالة الأسطر الفارغة من ملفات CSV',
    category: 'utilities', icon: '📄🧹',
    params: [
      { name: 'csvfile', label: 'محتوى الملف', type: 'textarea', required: true },
    ],
    requiresAccount: false,
  },
  {
    id: 'util_remove_banned', num: '02', name: 'autoRemoveBannedNumbers',
    label: 'حذف المحظورين تلقائياً',
    description: 'حذف الأرقام المحظورة تلقائياً من phone.csv',
    category: 'utilities', icon: '🚫📱',
    params: [
      { name: 'csvfile', label: 'phone.csv', type: 'textarea', required: true },
    ],
    requiresAccount: true,
  },
  {
    id: 'util_spambot', num: '03', name: 'limitCheckerRemover',
    label: 'فاحص/مزيل التقييد',
    description: 'فحص وإزالة التقييد عبر محادثة @spambot',
    category: 'utilities', icon: '🤖',
    params: [], requiresAccount: true,
  },
  {
    id: 'util_chat_clone', num: '04', name: 'groupChatCloner',
    label: 'مستنسخ دردشة المجموعة',
    description: 'استنساخ الرسائل من المصدر إلى الهدف',
    category: 'utilities', icon: '📋',
    params: [
      { name: 'source', label: 'المصدر', type: 'text', required: true },
      { name: 'target', label: 'الهدف', type: 'text', required: true },
      { name: 'nMsgs', label: 'عدد الرسائل', type: 'number', required: false, defaultValue: 50 },
    ],
    requiresAccount: true, danger: 'medium',
  },
  {
    id: 'util_group_maker', num: '05', name: 'autoGroupMaker',
    label: 'منشئ المجموعات تلقائي',
    description: 'إنشاء مجموعات تلقائياً (N لكل حساب)',
    category: 'utilities', icon: '🏗️',
    params: [
      { name: 'per', label: 'مجموعات لكل حساب', type: 'number', required: false, defaultValue: 1 },
    ],
    requiresAccount: true,
  },
  {
    id: 'util_vcf_extract', num: '06', name: 'extractVcfToNumbers',
    label: 'VCF → numbers.csv',
    description: 'استخراج أرقام الهواتف من ملف VCF',
    category: 'utilities', icon: '📇➡📄',
    params: [
      { name: 'vcf', label: 'محتوى ملف VCF', type: 'textarea', required: true },
    ],
    requiresAccount: false,
  },
  {
    id: 'util_vcf_import', num: '07', name: 'importVcfAsContacts',
    label: 'استيراد VCF كجهات اتصال',
    description: 'استيراد VCF كجهات اتصال',
    category: 'utilities', icon: '📇➡👤',
    params: [
      { name: 'vcf', label: 'محتوى ملف VCF', type: 'textarea', required: true },
      { name: 'maxPer', label: 'الحد الأقصى', type: 'number', required: false, defaultValue: 50 },
      { name: 'delay', label: 'التأخير', type: 'number', required: false, defaultValue: 2 },
    ],
    requiresAccount: true, danger: 'medium',
  },
  {
    id: 'util_status', num: '08', name: 'showStatus',
    label: 'الحالة — ملفات + dedup',
    description: 'عرض حالة data.csv, phone.csv, sessions, dedup',
    category: 'utilities', icon: '📊',
    params: [], requiresAccount: true,
  },
  {
    id: 'util_delete_done', num: '09', name: 'deleteAlreadyFilter',
    label: 'حذف المنجز من data.csv',
    description: 'إزالة صفوف data.csv الموجودة فعلاً في done.csv',
    category: 'utilities', icon: '🗑️✓',
    params: [
      { name: 'dataCsv', label: 'data.csv', type: 'textarea', required: true },
      { name: 'doneCsv', label: 'done.csv', type: 'textarea', required: false },
    ],
    requiresAccount: false,
  },
  {
    id: 'util_check_numbers', num: '10', name: 'checkNumbers',
    label: 'فحص الأرقام',
    description: 'فحص ما إذا كانت الأرقام مسجلة على تيليجرام',
    category: 'utilities', icon: '🔍📱',
    params: [
      { name: 'numbers', label: 'الأرقام (واحد لكل سطر)', type: 'textarea', required: true },
    ],
    requiresAccount: true,
  },
  {
    id: 'util_anon_chatter', num: '11', name: 'anonymousChatter',
    label: 'دردشة مجهولة',
    description: 'إرسال N رسالة لكل محادثة من كل الحسابات',
    category: 'utilities', icon: '💬',
    params: [
      { name: 'target', label: 'الهدف', type: 'text', required: true },
      { name: 'message', label: 'الرسالة', type: 'textarea', required: true },
      { name: 'nPer', label: 'رسائل لكل محادثة', type: 'number', required: false, defaultValue: 3 },
      { name: 'delay', label: 'التأخير', type: 'number', required: false, defaultValue: 2 },
    ],
    requiresAccount: true, badge: 'NEW',
  },
  {
    id: 'util_post_views', num: '12', name: 'postViewsIncreaser',
    label: 'مضاعف مشاهدات المنشورات',
    description: 'زيادة مشاهدات منشورات القناة عبر كل الحسابات',
    category: 'utilities', icon: '👁️📈',
    params: [
      { name: 'target', label: 'القناة', type: 'text', required: true },
      { name: 'maxId', label: 'آخر معرف منشور', type: 'number', required: false, defaultValue: 10 },
      { name: 'delayAcc', label: 'تأخير بين الحسابات', type: 'number', required: false, defaultValue: 2 },
      { name: 'delayPost', label: 'تأخير بين المنشورات', type: 'number', required: false, defaultValue: 1 },
    ],
    requiresAccount: true, badge: 'NEW',
  },
  {
    id: 'util_api_gen', num: '13', name: 'apiIdHashGenerator',
    label: 'مولّد API ID/Hash',
    description: 'توليد api_id + api_hash → api.csv',
    category: 'utilities', icon: '🔑⚡',
    params: [
      { name: 'interactive', label: 'وضع تفاعلي', type: 'checkbox', required: false, defaultValue: true },
      { name: 'append', label: 'إضافة لملف موجود', type: 'checkbox', required: false, defaultValue: false },
    ],
    requiresAccount: false, badge: 'NEW',
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

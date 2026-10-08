# njadder v1.2.1 — Unified Telegram Tool

لوحة تحكم ويب احترافية لأداة تيليجرام الموحدة — مع نظام تسجيل دخول حقيقي، PWA (تعمل بدون إنترنت)، و88 أمر موزّعة على 10 فئات.

> **المطور:** [@NMDDER_DEV](https://t.me/NMDDER_DEV) · **الدعم:** [@NMDDER_SUPPORT](https://t.me/NMDDER_SUPPORT)

---

## ✨ الميزات

### 🔐 نظام تسجيل دخول حقيقي
- تسجيل حساب جديد عبر البريد الإلكتروني + كلمة المرور
- كلمات المرور مشفّرة بـ **bcrypt** (cost factor 12)
- الجلسات عبر **JWT cookies** — مناسب لـ Vercel serverless
- حماية اللوحة خلف تسجيل الدخول — لا يمكن الوصول للأوامر بدون حساب

### 📱 PWA (Progressive Web App)
- تعمل **بدون إنترنت** بعد أول تحميل
- قابلة للتثبيت كتطبيق أصلي على الهاتف والحاسب
- Service Worker مع 3 استراتيجيات تخزين مؤقت
- مزامنة تلقائية عند عودة الاتصال

### 🛠 88 أمر في 10 فئات

| الفئة | عدد الأوامر | الوصف |
|------|------------|-------|
| الحسابات | 8 | Login, Secure Login, Live Ban Checker, OTP Viewer |
| أدوات السحب | 9 | Public/Private/Hidden/Full/Premium Scraper |
| إضافة الأعضاء | 6 | DirectAdder, ContactAdder, BulkAdder, RamexAdder |
| الفلاتر | 8 | Daily/Weekly/Monthly/Online/Non-Active/Hidden |
| الإضافة الجغرافية | 3 | Auto-detect (20 دولة), Lat/Long, City |
| الرسائل والإرسال | 17 | Send, Forward, DM, Multi-msg, Ramex Sender |
| البلاغات | 12 | 10 أسباب + Report User + Scam Report |
| أدوات الحساب | 8 | Profile, Username, 2FA, Random Name |
| الأدوات المساعدة | 13 | CSV, VCF, Anonymous Chatter, Post Views, API Generator |
| إدارة المجموعات | 4 | Mass Join/Leave |

### 🆕 ميزات الإصدار v1.2.1
- ✅ **Secure Login** — تناوب api.csv + devices.csv + proxies.csv لكل حساب
- ✅ **Live Ban Checker** — فحص فعلي للحسابات المحظورة عبر تسجيل الدخول
- ✅ **Post Views Increaser** — زيادة مشاهدات منشورات القناة
- ✅ **API ID/Hash Generator** — توليد مفاتيح API تلقائياً
- ✅ **Anonymous Chatter** — دردشة مجهولة من كل الحسابات
- ✅ **Auto Group Maker** — إنشاء مجموعات تلقائياً

---

## 🚀 النشر على Vercel.com

### المتطلبات
1. حساب على [Vercel](https://vercel.com/signup) (مجاني)
2. حساب على [GitHub](https://github.com) لرفع الكود

### الخطوة 1: رفع الكود إلى GitHub

```bash
# فك ضغط الملف
unzip njadder-vercel-deploy.zip
cd njadder-vercel-deploy

# تثبيت الحزم محلياً (اختياري - للاختبار)
bun install   # أو: npm install

# تهيئة Git
git init
git add .
git commit -m "njadder v1.2.1 - initial deploy"
git branch -M main

# أنشئ مستودع على GitHub ثم ارفع
git remote add origin https://github.com/YOUR_USERNAME/njadder-dashboard.git
git push -u origin main
```

### الخطوة 2: إنشاء مشروع على Vercel

1. اذهب إلى [vercel.com/new](https://vercel.com/new)
2. اختر مستودع GitHub الذي رفعته
3. Vercel سيكتشف Next.js تلقائياً — اترك الإعدادات الافتراضية
4. في قسم **Environment Variables**، أضف:

| المتغير | القيمة | ملاحظة |
|--------|-------|--------|
| `DATABASE_URL` | (من خطوة 3) | مطلوب |
| `NEXTAUTH_SECRET` | (32 حرف عشوائي) | مطلوب |
| `NEXTAUTH_URL` | `https://YOUR_APP.vercel.app` | مطلوب |

لإنشاء `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

5. اضغط **Deploy** ✅

### الخطوة 3: إعداد قاعدة البيانات (Vercel Postgres)

1. في لوحة Vercel، اذهب إلى مشروعك → **Storage** tab
2. اضغط **Create Database** → **Postgres** (free tier)
3. بعد الإنشاء، اضغط **Connect to Project** — سيُضاف `DATABASE_URL` تلقائياً
4. الـ `prisma/schema.prisma` مُعدّ مسبقاً لـ `postgresql`

### الخطوة 4: إنشاء جداول قاعدة البيانات

بعد النشر الأول، شغّل migration:

```bash
# تثبيت Vercel CLI (مرة واحدة)
npm i -g vercel

# تسجيل الدخول
vercel login

# ربط المشروع المحلي بالبعيد
vercel link

# سحب متغيرات البيئة
vercel env pull .env.production.local

# تشغيل Prisma migration على الإنتاج
npx prisma db push
# أو
npx prisma migrate deploy
```

### الخطوة 5: اختبار النظام

1. افتح رابط Vercel: `https://YOUR_APP.vercel.app`
2. ستظهر شاشة تسجيل الدخول (AuthGate)
3. اضغط **"ابدأ الآن — أنشئ حساباً"**
4. أدخل بريد إلكتروني + كلمة مرور (8+ أحرف)
5. اضغط **"إنشاء الحساب"** — سيتم إنشاء الحساب وتسجيل الدخول تلقائياً ✓
6. ستظهر لوحة التحكم الكاملة

---

## 💻 التشغيل محلياً

```bash
# 1. تثبيت الحزم
bun install   # أو: npm install

# 2. إعداد متغيرات البيئة
cp .env.example .env
# عدّل .env وأضف NEXTAUTH_SECRET عشوائي

# 3. للتبديل إلى SQLite محلياً:
#    في prisma/schema.prisma، غيّر:
#    provider = "postgresql"  →  provider = "sqlite"
#    وفي .env:
#    DATABASE_URL="file:./db/custom.db"

# 4. إنشاء الجداول
bun run db:push

# 5. تشغيل خادم التطوير
bun run dev   # أو: npm run dev

# افتح http://localhost:3000
```

---

## 🗂️ بنية المشروع

```
njadder-vercel-deploy/
├── src/
│   ├── app/
│   │   ├── api/auth/
│   │   │   ├── [...nextauth]/route.ts  # NextAuth handler
│   │   │   └── signup/route.ts          # Sign-up endpoint
│   │   ├── layout.tsx                   # RTL layout + SessionProvider
│   │   ├── page.tsx                     # AuthGate + Dashboard
│   │   └── globals.css                  # Telegram-themed dark palette
│   ├── components/
│   │   ├── auth/                        # AuthModal, AuthGate, SessionProvider
│   │   ├── dashboard/                   # Header, Sidebar, CommandGrid, etc.
│   │   ├── modals/                      # Config, Proxy, Accounts, SecureLogin, BanChecker
│   │   └── pwa/                         # PWAProvider, PWAStatusButton
│   └── lib/
│       ├── commands.ts                  # 88 أمر في 10 فئات
│       ├── store.ts                     # Zustand store
│       └── db.ts                        # Prisma client
├── prisma/
│   └── schema.prisma                    # User, Account, Session models
├── public/
│   ├── icons/                          # PWA icons (16px - 512px)
│   ├── manifest.webmanifest            # PWA manifest
│   ├── sw.js                           # Service Worker
│   └── icon.svg                        # Main app icon
├── .env.example                        # Environment variables template
├── .gitignore
├── DEPLOY.md                           # دليل النشر التفصيلي
├── vercel.json                         # Vercel configuration
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
└── README.md                           # هذا الملف
```

---

## 🔒 الأمان

- ✅ كلمات المرور مشفّرة بـ **bcrypt** (cost factor 12)
- ✅ الجلسات عبر **JWT** — لا تُخزّن في قاعدة البيانات
- ✅ Cookies آمنة (`httpOnly`, `secure` في الإنتاج)
- ✅ CSRF protection مفعّل تلقائياً عبر NextAuth
- ✅ **API ID و API Hash مخفيان افتراضياً** في إعدادات config.ini
- ⚠️ لا تضع `NEXTAUTH_SECRET` في الكود — استخدم دائماً Environment Variables

---

## 🛠️ استكشاف الأخطاء

### `NEXTAUTH_SECRET` مفقود
```
Error: NEXTAUTH_SECRET is not set
```
**الحل**: أضف المتغير في Vercel Project Settings → Environment Variables

### `DATABASE_URL` غير صالح
```
Error: PrismaClientInitializationError
```
**الحل**: تأكد من أن `provider` في `prisma/schema.prisma` مطابق لنوع قاعدة البيانات:
- Vercel Postgres → `"postgresql"` (الافتراضي)
- SQLite محلي → `"sqlite"`

### لا يمكن تسجيل الدخول بعد النشر
```
Error: Cannot find module '@prisma/client'
```
**الحل**: تأكد من وجود `"postinstall": "prisma generate"` في `package.json` scripts — هو موجود افتراضياً.

### المزيد من الأخطاء؟
راجع `DEPLOY.md` لقائمة كاملة من الحلول.

---

## 📞 الدعم

- **المطور:** [@NMDDER_DEV](https://t.me/NMDDER_DEV)
- **مجموعة الدعم:** [@NMDDER_SUPPORT](https://t.me/NMDDER_SUPPORT)

---

## 📄 الترخيص

هذا المشروع مطوّر بواسطة @NMDDER_DEV. الاستخدام التجاري يتطلب إذناً صريحاً.

---

## 🙏 شكر خاص

مدمجة من:
- `opthree.py` — الميزات الأساسية
- `ramexfour.py` — الفلاتر والإضافة الجغرافية
- `ts.py` — الرسائل والإرسال

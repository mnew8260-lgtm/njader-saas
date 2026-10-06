# 🚀 دليل تثبيت على Vercel (نسخة GramJS — بدون Python)
# ========================================================
# هذه النسخة مخصصة لـ Vercel.com — لا تحتاج Python، ولا ملفات .session،
# ولا disk دائم. كل شيء في Postgres + KV (Redis).

## 📋 المحتوى

```
njader-vercel-flow/
├── prisma/schema.prisma                  # محدّث: PostgreSQL + sessionString
├── scripts/create-owner-vercel.ts        # إنشاء Owner
├── src/lib/telegram/client.ts            # GramJS client (لا Python!)
├── src/components/telegram/
│   └── TelegramLogin.tsx                 # React component
├── src/app/(dashboard)/telegram-login/
│   └── page.tsx                          # صفحة تسجيل الدخول
├── src/app/(dashboard)/admin/api-pool/
│   └── page.tsx                          # لوحة إدارة pool
├── src/app/api/telegram/
│   ├── send-code/route.ts                # خطوة 1
│   ├── verify-code/route.ts              # خطوة 2
│   ├── verify-password/route.ts          # خطوة 3 (2FA)
│   ├── status/route.ts                   # فحص الحالة
│   └── logout/route.ts                   # تسجيل الخروج
├── src/app/api/admin/api-pool/
│   ├── list/route.ts
│   ├── add/route.ts
│   └── remove/route.ts
├── package.additions.json                # الباقات المطلوب إضافتها
└── INSTALL_VERCEL.md                     # هذا الملف
```

## ✨ المميزات

1. **Vercel-compatible 100%**:
   - ✅ لا Python subprocess (GramJS pure JS)
   - ✅ لا ملفات .session (StringSession في DB)
   - ✅ لا disk دائم (Postgres + KV)
   - ✅ maxDuration لكل route

2. **نفس التدفق بثلاث خطوات** (phone → code → password)
3. **API Pool إدارة المالك** (Postgres)
4. **معالجة FloodWait + 2FA + INVALID_CODE**

---

## 📦 خطوات التثبيت على Vercel

### الخطوة 1: نسخ الملفات لمشروعك

```bash
cd /d/njader-saas

# انسخ njader-vercel-flow.zip إلى المشروع ثم:
unzip -o njader-vercel-flow.zip -d .

# نسخ الملفات:
cp njader-vercel-flow/prisma/schema.prisma prisma/schema.prisma
cp njader-vercel-flow/scripts/create-owner-vercel.ts scripts/
cp -r njader-vercel-flow/src/lib/telegram src/lib/
cp -r njader-vercel-flow/src/components/telegram src/components/
cp -r njader-vercel-flow/src/app/api/telegram src/app/api/
cp -r njader-vercel-flow/src/app/api/admin/api-pool src/app/api/admin/
cp -r njader-vercel-flow/src/app/\(dashboard\)/telegram-login "src/app/(dashboard)/"
cp -r njader-vercel-flow/src/app/\(dashboard\)/admin/api-pool "src/app/(dashboard)/admin/"
```

### الخطوة 2: تثبيت الحزم

```bash
npm install telegram @vercel/kv @vercel/postgres
# أو:
bun add telegram @vercel/kv @vercel/postgres
```

### الخطوة 3: إعداد Vercel Postgres

1. اذهب إلى https://vercel.com/dashboard
2. اختر مشروعك → **Storage** tab
3. اضغط **Create Database** → **Postgres** (Neon)
4. ستحصل على: `POSTGRES_URL`
5. تأكد أنه مُضبط في **Environment Variables**

### الخطوة 4: إعداد Vercel KV (Redis)

1. في Vercel → Storage tab
2. اضغط **Create Database** → **KV** (Upstash)
3. ستحصل على: `KV_REST_API_URL`, `KV_REST_API_TOKEN`

### الخطوة 5: متغيرات البيئة على Vercel

في Vercel → Settings → Environment Variables:

```bash
POSTGRES_URL=postgres://xxx  # من Vercel Postgres
KV_REST_API_URL=https://xxx.kv.vercel-storage.com
KV_REST_API_TOKEN=xxx
NEXTAUTH_SECRET=<random-32-chars>  # لو تستخدم NextAuth
NEXTAUTH_URL=https://your-app.vercel.app
```

### الخطوة 6: تطبيق Schema على Postgres

```bash
# سحب متغيرات البيئة محلياً:
vercel env pull .env.local

# تطبيق الـ schema:
npx prisma db push

# إنشاء Owner:
npx tsx scripts/create-owner-vercel.ts
```

### الخطوة 7: ارفع الكود لـ GitHub

```bash
git add -A
git commit -m "feat: Vercel-compatible Telegram login (GramJS + Postgres + KV)"
git push
```

### الخطوة 8: Vercel سيقوم بالـ deploy تلقائياً

---

## 🎯 الاختلافات بين نسخة Render و Vercel

| الميزة | نسخة Render | نسخة Vercel |
|---|---|---|
| Telegram library | Telethon (Python) | GramJS (TypeScript) |
| Session storage | ملفات .session على disk | StringSession في Postgres |
| Database | SQLite (file) | PostgreSQL (Vercel Postgres) |
| Short-lived state | ذاكرة Python | Vercel KV (Redis) |
| Python needed | ✅ نعم | ❌ لا |
| Dockerfile | مطلوب | غير مطلوب |
| Cost | مجاني (sleep) | مجاني (256MB PG + 256MB KV) |

---

## ⚠️ قيود Vercel

1. **Max Duration**:
   - Hobby: 10 ثواني لكل request
   - Pro: 60 ثانية
   - Enterprise: 300 ثانية

   تسجيل دخول تيليجرام عادة يستغرق 5-10 ثواني، لكن FloodWait قد يأخذ أكثر. للاستخدام المكثف: استخدم Vercel Pro.

2. **No persistent disk**: ملفات `.session` لا تعمل على Vercel — لذلك استخدمنا StringSession.

3. **No long-running background tasks**: إذا أردت إرسال رسائل متعددة على دفعات، استخدم Vercel Cron Jobs أو أعدّ الخدمة على Render.

---

## 🐛 مشاكل شائعة

### "Cannot find module 'telegram'"
الحل: `npm install telegram`

### "Cannot find module '@vercel/kv'"
الحل: `npm install @vercel/kv`

### "POSTGRES_URL is not defined"
الحل: تأكد أن Postgres مُضاف في Vercel → Storage → Postgres

### "KV_REST_API_URL is not defined"
الحل: تأكد أن KV مُضاف في Vercel → Storage → KV

### "Function execution timed out"
السبب: الـ request تجاوز 10 ثواني (Hobby)
الحل: ارتقِ إلى Vercel Pro (60 ثانية) أو اضبط `export const maxDuration = 60`

### "API_POOL_EMPTY"
الحل: اذهب لـ `/admin/api-pool` وأضف API credentials من https://my.telegram.org/apps

---

## 📞 الدعم
- Telegram: @NMDDER_DEV
- © 2026 NMDDER

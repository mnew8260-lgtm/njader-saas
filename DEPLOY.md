# 🚀 دليل النشر على Vercel

هذا الدليل يشرح كيفية نشر لوحة `njadder v1.2.1` على [Vercel](https://vercel.com) مع نظام تسجيل دخول حقيقي يعمل عبر البريد الإلكتروني وكلمة المرور.

---

## 📋 المتطلبات

1. حساب على [Vercel](https://vercel.com/signup) (مجاني)
2. حساب على [GitHub](https://github.com) (لرفع الكود)
3. (اختياري) قاعدة بيانات Vercel Postgres مجانية

---

## 1️⃣ رفع الكود إلى GitHub

```bash
# في مجلد المشروع
git init
git add .
git commit -m "njadder v1.2.1 - PWA + Auth"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/njadder-dashboard.git
git push -u origin main
```

---

## 2️⃣ إنشاء مشروع على Vercel

1. اذهب إلى [vercel.com/new](https://vercel.com/new)
2. اختر مستودع GitHub الذي رفعته
3. Vercel سيكتشف Next.js تلقائياً — اترك الإعدادات الافتراضية
4. في قسم **Environment Variables**، أضف:

| المتغير | القيمة | ملاحظة |
|--------|-------|--------|
| `DATABASE_URL` | (من خطوة 3 أدناه) | مطلوب |
| `NEXTAUTH_SECRET` | (32 حرف عشوائي) | مطلوب |
| `NEXTAUTH_URL` | `https://YOUR_APP.vercel.app` | مطلوب |

لإنشاء `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

5. اضغط **Deploy** ✅

---

## 3️⃣ إعداد قاعدة البيانات (Vercel Postgres)

### الخيار أ: Vercel Postgres (موصى به)

1. في لوحة Vercel، اذهب إلى مشروعك → **Storage** tab
2. اضغط **Create Database** → **Postgres** (free tier)
3. بعد الإنشاء، اضغط **Connect to Project** — سيُضاف `DATABASE_URL` تلقائياً
4. حدّث `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"   // غيّر من "sqlite" إلى "postgresql"
  url      = env("DATABASE_URL")
}
```

5. ارفع التغيير إلى GitHub — ستتم إعادة النشر تلقائياً

### الخيار ب: استمرار مع SQLite (غير مدعوم على Vercel)

SQLite لا يعمل على Vercel لأن filesystem للقراءة فقط. استخدم Postgres.

---

## 4️⃣ إنشاء جداول قاعدة البيانات

بعد النشر الأول، شغّل migration عبر Vercel CLI:

```bash
# تثبيت Vercel CLI (مرة واحدة)
npm i -g vercel

# تسجيل الدخول
vercel login

# ربط المشروع المحلي بالبعيد
cd /path/to/njadder-dashboard
vercel link

# تشغيل Prisma migration على الإنتاج
vercel env pull .env.production.local
npx prisma migrate deploy
# أو
npx prisma db push
```

---

## 5️⃣ اختبار النظام

1. افتح رابط Vercel: `https://YOUR_APP.vercel.app`
2. ستظهر صفحة تسجيل الدخول (AuthGate)
3. اضغط **"ابدأ الآن — أنشئ حساباً"**
4. أدخل بريد إلكتروني + كلمة مرور (8+ أحرف)
5. اضغط **"إنشاء الحساب"**
6. سيتم إنشاء الحساب وتسجيل الدخول تلقائياً ✓
7. ستظهر لوحة التحكم الكاملة

---

## 🔧 استكشاف الأخطاء

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
- SQLite → `"sqlite"`
- Vercel Postgres → `"postgresql"`

### الجلسة لا تستمر
```
Error: JWT decode failed
```
**الحل**: تأكد من أن `NEXTAUTH_URL` يطابق رابط Vercel الفعلي (بما في ذلك `https://`)

### لا يمكن تسجيل الدخول بعد النشر
```
Error: Cannot find module '@prisma/client'
```
**الحل**: أضف `postinstall` script إلى `package.json`:
```json
"scripts": {
  "postinstall": "prisma generate"
}
```

---

## 📞 الدعم

- المطور: [@NMDDER_DEV](https://t.me/NMDDER_DEV)
- مجموعة الدعم: [@NMDDER_SUPPORT](https://t.me/NMDDER_SUPPORT)

---

## 🔒 ملاحظات أمنية

- ✅ كلمات المرور مشفّرة بـ **bcrypt** (cost factor 12)
- ✅ الجلسات عبر **JWT** (لا تحتاج Database sessions)
- ✅ Cookies آمنة (`httpOnly`, `secure` في الإنتاج)
- ✅ CSRF protection مفعّل تلقائياً عبر NextAuth
- ⚠️ لا تضع `NEXTAUTH_SECRET` في الكود — استخدم دائماً Environment Variables

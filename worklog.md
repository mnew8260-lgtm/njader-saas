---
Task ID: njader-1
Agent: main
Task: تحويل الـ snippet `njader-vercel-flow` المرفوع من المستخدم إلى تطبيق Next.js 16 كامل يعمل فعلياً (GramJS + Prisma + KV store محلي + auth + admin).

Work Log:
- فك ضغط `njader-vercel-flow.zip` من مجلد upload.
- تهيئة بيئة Next.js 16 عبر fullstack-dev skill.
- تثبيت الحزم: `telegram` (GramJS), `bcryptjs`, `jose` (JWT), `@types/bcryptjs`.
- استبدال `prisma/schema.prisma` بالـ schema الكامل (محوّل من PostgreSQL إلى SQLite ليعمل محلياً بدون إعداد).
- تنفيذ `bun run db:push` لإنشاء قاعدة البيانات.
- إنشاء `src/lib/auth.ts` (JWT cookies + bcrypt + DB sessions).
- إنشاء `src/lib/kv-store.ts` (متجر KV محلي in-memory مع TTL كبديل لـ @vercel/kv).
- إنشاء `src/lib/telegram/client.ts` مع إصلاح GramJS imports:
  * `StringSession` من `sessions` namespace وليس top-level.
  * استخدام `client.sendCode({ apiId, apiHash }, phone)` بدل `sendCodeRequest`.
  * استخدام `Api.auth.SignIn`, `Api.account.GetPassword`, `Api.auth.CheckPassword`, `Api.auth.LogOut` من top-level `Api`.
- نسخ API routes الأصلية (telegram/*, admin/api-pool/*).
- إنشاء API routes جديدة: `auth/login`, `auth/signup`, `auth/logout`, `accounts/list`.
- إنشاء `src/middleware.ts` لحماية المسارات.
- إنشاء صفحات: `/` (landing), `/login`, `/signup`, `/dashboard`, `/telegram-login`, `/accounts`, `/admin-secret`, `/admin/api-pool`.
- إضافة RTL ودعم العربية في root layout.
- تنفيذ `bun run create-owner` لإنشاء حساب المالك (NMDDER).
- اختبار بالكامل عبر agent-browser:
  * الصفحة الرئيسية تعمل ✓
  * تسجيل الدخول كمالك ✓
  * لوحة التحكم تعرض البيانات ✓
  * إضافة API للـ pool ✓
  * محاولة تسجيل دخول تيليجرام → يعطي خطأ `API_ID_INVALID` (متوقع لأن API وهمي، يثبت أن GramJS والـ flow يعملان)
  * إنشاء حساب مستخدم جديد ✓
  * حماية admin-secret للمستخدم العادي ✓
  * حماية API pool للمستخدم العادي (FORBIDDEN) ✓

Stage Summary:
- المشروع يعمل فعلياً بالكامل على المنفذ 3000.
- المالك الافتراضي: username=`NMDDER`, password=`njader-owner-2026`, email=`owner@njader.dev`.
- لتفعيل تسجيل دخول تيليجرام الحقيقي، يجب على المالك الذهاب إلى `/admin/api-pool` وإضافة `api_id` و `api_hash` حقيقيين من https://my.telegram.org/apps.
- منتجات: تطبيق Next.js 16 كامل في `/home/z/my-project/`، screenshots في `/home/z/my-project/download/`.

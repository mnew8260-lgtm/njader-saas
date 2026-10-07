#!/usr/bin/env bash
# Pack the NJADDER project source into a zip for download.
set -euo pipefail

SRC_DIR="/home/z/my-project"
OUT_DIR="/home/z/my-project/download"
STAGE_DIR="/tmp/njader-pkg-stage"

rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR/njader-saas"

# Copy source directories
for d in src prisma scripts public; do
  if [ -d "$SRC_DIR/$d" ]; then
    cp -r "$SRC_DIR/$d" "$STAGE_DIR/njader-saas/"
  fi
done

# Copy root config files
for f in package.json bun.lock tsconfig.json next.config.ts \
         tailwind.config.ts postcss.config.mjs eslint.config.mjs \
         components.json Caddyfile .env; do
  if [ -f "$SRC_DIR/$f" ]; then
    cp "$SRC_DIR/$f" "$STAGE_DIR/njader-saas/"
  fi
done

# Remove node_modules, .next, db, etc. from the stage copy (none copied, but safe to clean)
rm -rf "$STAGE_DIR/njader-saas/node_modules" \
       "$STAGE_DIR/njader-saas/.next" \
       "$STAGE_DIR/njader-saas/db"

# Add a top-level README
cat > "$STAGE_DIR/njader-saas/README.md" <<'EOF'
# NJADDER SaaS — Telegram Login Flow

تطبيق Next.js 16 كامل لتسجيل دخول تيليجرام (GramJS + Prisma + JWT + KV store محلي).

## التشغيل المحلي

```bash
# 1) ثبّت الحزم
bun install   # أو npm install

# 2) أنشئ ملف .env (المشروع يأتي مع .env يحتوي DATABASE_URL=file:./db/custom.db)

# 3) ادفع schema لقاعدة البيانات
bun run db:push

# 4) أنشئ حساب المالك
bun run create-owner
# username: NMDDER
# password: njader-owner-2026

# 5) شغّل السيرفر
bun run dev   # http://localhost:3000
```

## الحساب الافتراضي للمالك

- Username: `NMDDER`
- Password: `njader-owner-2026`
- Email: `owner@njader.dev`
- لوحة المالك: `/admin-secret`
- لوحة API pool: `/admin/api-pool`

## لتشغيل تسجيل دخول تيليجرام الحقيقي

1. سجّل دخول كمالك
2. اذهب إلى `/admin/api-pool`
3. أضف `api_id` و `api_hash` حقيقيين من https://my.telegram.org/apps
4. جرّب `/telegram-login`

## النشر على Vercel

1. بدّل في `prisma/schema.prisma`:
   - `provider = "postgresql"`
   - `url = env("POSTGRES_URL")`
2. أنشئ Postgres + KV في Vercel Storage
3. استبدل `src/lib/kv-store.ts` بـ `@vercel/kv` (اختياري للحالة متعددة المثيلات)
4. اضبط متغيرات البيئة: `POSTGRES_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `NEXTAUTH_SECRET`

## التقنيات

- Next.js 16 (App Router) + TypeScript 5
- Prisma ORM (SQLite محلياً، PostgreSQL على Vercel)
- GramJS (`telegram@2.26.x`) — تسجيل دخول تيليجرام بدون Python
- bcryptjs + jose (JWT cookies) للمصادقة
- shadcn/ui + Tailwind CSS 4
- KV store محلي (in-memory مع TTL)

## بنية المشروع

```
src/
├── app/
│   ├── (auth)/          # login + signup
│   ├── (dashboard)/     # dashboard + accounts + telegram-login + admin
│   ├── api/             # auth + telegram + admin routes
│   └── page.tsx         # landing
├── components/
│   ├── telegram/        # TelegramLogin component
│   ├── dashboard/       # nav
│   └── ui/              # shadcn/ui
├── lib/
│   ├── auth.ts          # JWT + bcrypt
│   ├── db.ts            # Prisma client
│   ├── kv-store.ts      # local KV (TTL)
│   └── telegram/client.ts  # GramJS client
├── scripts/create-owner.ts
└── prisma/schema.prisma
```

© 2026 NMDDER · @NMDDER_DEV
EOF

# Build the zip
cd "$STAGE_DIR"
zip -qr9 "$OUT_DIR/njader-saas.zip" njader-saas/

# Cleanup
rm -rf "$STAGE_DIR"

ls -la "$OUT_DIR/njader-saas.zip"
echo "---"
du -sh "$OUT_DIR/njader-saas.zip"

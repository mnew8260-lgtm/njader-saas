'use client';

// (dashboard)/telegram-login/page.tsx — Vercel-compatible
import { TelegramLogin } from '@/components/telegram/TelegramLogin';

export default function TelegramLoginPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold">تسجيل دخول تيليجرام</h1>
        <p className="text-sm text-muted-foreground">
          أضف حسابك إلى NJADDER — خطوة واحدة في كل مرة
        </p>
      </div>
      <TelegramLogin />
    </div>
  );
}

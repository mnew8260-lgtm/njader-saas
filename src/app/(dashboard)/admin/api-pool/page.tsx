'use client';

// (dashboard)/admin/api-pool/page.tsx — Vercel-compatible
import { ApiPoolManager } from '@/components/telegram/TelegramLogin';

export default function ApiPoolPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">إدارة API Pool</h1>
        <p className="text-sm text-muted-foreground">
          أضف / احذف API credentials التي يستخدمها المستخدمون تلقائياً
        </p>
      </div>
      <ApiPoolManager />
    </div>
  );
}

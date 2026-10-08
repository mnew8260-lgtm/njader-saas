'use client';

import { useState } from 'react';
import { TelegramLogin } from '@/components/telegram/TelegramLogin';
import { BulkLogin } from '@/components/telegram/BulkLogin';
import { Phone, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function TelegramLoginPage() {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <div className="mb-4 text-center">
        <h1 className="text-2xl font-bold">تسجيل دخول تيليجرام</h1>
        <p className="text-sm text-muted-foreground mt-1">
          أضف حسابك إلى njadder — خطوة واحدة في كل مرة أو جماعي
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={mode === 'single' ? 'default' : 'outline'}
          onClick={() => setMode('single')}
          className="flex-1 gap-1.5"
          size="sm"
        >
          <Phone className="size-4" />
          حساب واحد
        </Button>
        <Button
          variant={mode === 'bulk' ? 'default' : 'outline'}
          onClick={() => setMode('bulk')}
          className="flex-1 gap-1.5"
          size="sm"
        >
          <Users className="size-4" />
          دخول جماعي (Multi)
        </Button>
      </div>

      {mode === 'single' ? (
        <TelegramLogin />
      ) : (
        <BulkLogin />
      )}

      <Card className="mt-4 bg-muted/30">
        <CardContent className="py-4">
          <p className="text-xs text-muted-foreground text-center">
            💡 <strong>نصيحة:</strong> أضف عدة حسابات لتستفيد من ميزة Multi-Account في /mass-tools
            <br />
            كل حساب سيحصل على بروكسي تلقائي مختلف لحمايته من الحظر
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Clock, XCircle, AlertTriangle, RotateCw, LogOut } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

const REASONS: Record<string, { icon: JSX.Element; title: string; message: string; variant: 'pending' | 'rejected' | 'expired' }> = {
  pending: {
    icon: <Clock className="size-12 text-blue-500" />,
    title: 'حسابك قيد المراجعة',
    message: 'تم تسجيل حسابك بنجاح، وبانتظار موافقة المالك على طلب اشتراكك. عادةً يتم الرد خلال ساعات قليلة.',
    variant: 'pending',
  },
  rejected: {
    icon: <XCircle className="size-12 text-red-500" />,
    title: 'تم رفض طلب الاشتراك',
    message: 'للأسف لم تتم الموافقة على طلبك. إذا كنت تعتقد أن هذا خطأ، تواصل مع الدعم.',
    variant: 'rejected',
  },
  expired: {
    icon: <AlertTriangle className="size-12 text-amber-500" />,
    title: 'انتهت مدة اشتراكك',
    message: 'انتهت فترة اشتراكك في المنصة. يرجى التواصل مع المالك لتجديد الاشتراك.',
    variant: 'expired',
  },
};

function PendingContent() {
  const search = useSearchParams();
  const router = useRouter();
  const reason = search.get('reason') || 'pending';
  const info = REASONS[reason] || REASONS.pending;

  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    const id = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const reload = () => {
    if (countdown === 0) {
      router.push('/dashboard');
    } else {
      window.location.reload();
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <Card className="border-0 shadow-2xl">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-3">{info.icon}</div>
        <CardTitle className="text-2xl">{info.title}</CardTitle>
        <CardDescription className="text-base mt-2 leading-relaxed">
          {info.message}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className={
          info.variant === 'pending' ? 'bg-blue-500/10 border-blue-500/30' :
          info.variant === 'rejected' ? 'bg-red-500/10 border-red-500/30' :
          'bg-amber-500/10 border-amber-500/30'
        }>
          <AlertDescription className="text-sm">
            {info.variant === 'pending' && '📧 تم إرسال إشعار إلى المالك بطلبك.'}
            {info.variant === 'rejected' && '🔒 للاستفسار عن سبب الرفض، تواصل مع الدعم.'}
            {info.variant === 'expired' && '⏰ لتجديد اشتراكك، تواصل مع المالك عبر @NMDDER_DEV'}
          </AlertDescription>
        </Alert>

        <div className="flex flex-col gap-2">
          <Button onClick={reload} className="w-full gap-2" variant="default">
            <RotateCw className="size-4" />
            {countdown > 0 ? `إعادة التحقق (${countdown}s)` : 'الذهاب للوحة التحكم'}
          </Button>
          <Button onClick={logout} variant="outline" className="w-full gap-2">
            <LogOut className="size-4" /> تسجيل الخروج
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground pt-2 border-t">
          للدعم تواصل عبر:{' '}
          <a href="https://t.me/NMDDER_DEV" target="_blank" rel="noreferrer" className="text-primary underline font-medium">
            @NMDDER_DEV
          </a>
        </p>
      </CardContent>
    </Card>
  );
}

export default function PendingPage() {
  return (
    <Suspense fallback={<div className="text-center text-sm text-muted-foreground">جارٍ التحميل…</div>}>
      <PendingContent />
    </Suspense>
  );
}

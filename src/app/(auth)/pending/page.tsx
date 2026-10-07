'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Clock, XCircle, AlertTriangle, RotateCw, LogOut, CheckCircle2 } from 'lucide-react';
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
  const initialReason = search.get('reason') || 'pending';
  const [reason, setReason] = useState(initialReason);
  const [countdown, setCountdown] = useState(15);
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);

  const info = REASONS[reason] || REASONS.pending;

  // Check if user was approved in DB (refresh JWT)
  const checkStatus = useCallback(async () => {
    setChecking(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST' });
      const data = await res.json();

      if (!data.ok) {
        setFeedback(data.message || data.error || 'فشل التحديث');
        return;
      }

      const status = data.user?.accountStatus;

      if (status === 'approved') {
        setApproved(true);
        setFeedback('✅ تم تفعيل حسابك! جارٍ تحويلك للوحة التحكم…');
        // Redirect to dashboard after short delay
        setTimeout(() => {
          router.push('/dashboard');
          router.refresh();
        }, 1500);
      } else {
        setReason(status || 'pending');
        setFeedback(`⏳ حالة الحساب الحالية: ${status || 'pending'}`);
      }
    } catch (e: any) {
      setFeedback(e.message);
    } finally {
      setChecking(false);
    }
  }, [router]);

  // Auto-check every 15 seconds while pending
  useEffect(() => {
    if (approved) return;
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          checkStatus();
          return 15;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [approved, checkStatus]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <Card className="border-0 shadow-2xl">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-3">
          {approved ? <CheckCircle2 className="size-12 text-emerald-500" /> : info.icon}
        </div>
        <CardTitle className="text-2xl">
          {approved ? 'تم تفعيل حسابك!' : info.title}
        </CardTitle>
        <CardDescription className="text-base mt-2 leading-relaxed">
          {approved ? 'يمكنك الآن الوصول إلى لوحة التحكم واستخدام كل الميزات.' : info.message}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className={
          approved ? 'bg-emerald-500/10 border-emerald-500/30' :
          info.variant === 'pending' ? 'bg-blue-500/10 border-blue-500/30' :
          info.variant === 'rejected' ? 'bg-red-500/10 border-red-500/30' :
          'bg-amber-500/10 border-amber-500/30'
        }>
          <AlertDescription className="text-sm">
            {approved ? '✅ تم تحديث صلاحياتك بنجاح' :
              info.variant === 'pending' && '📧 تم إرسال إشعار إلى المالك بطلبك. سيتم فحص الحالة تلقائياً.'}
            {info.variant === 'rejected' && '🔒 للاستفسار عن سبب الرفض، تواصل مع الدعم.'}
            {info.variant === 'expired' && '⏰ لتجديد اشتراكك، تواصل مع المالك عبر @NMDDER_DEV'}
          </AlertDescription>
        </Alert>

        {feedback && (
          <Alert>
            <AlertDescription className="text-sm">{feedback}</AlertDescription>
          </Alert>
        )}

        {!approved && info.variant === 'pending' && (
          <p className="text-xs text-center text-muted-foreground">
            سيتم فحص الحالة تلقائياً كل 15 ثانية. التالي خلال {countdown}s
          </p>
        )}

        <div className="flex flex-col gap-2">
          {!approved && (
            <Button onClick={checkStatus} disabled={checking} className="w-full gap-2">
              {checking ? <RotateCw className="size-4 animate-spin" /> : <RotateCw className="size-4" />}
              {checking ? 'جارٍ الفحص…' : 'فحص الحالة الآن'}
            </Button>
          )}
          {approved && (
            <Button onClick={() => router.push('/dashboard')} className="w-full gap-2">
              الذهاب للوحة التحكم
            </Button>
          )}
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

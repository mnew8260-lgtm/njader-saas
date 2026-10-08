'use client';

import { useState } from 'react';
import { Loader2, ShieldCheck, ShieldAlert, RefreshCw, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BanCheck {
  isBanned: boolean;
  reason: string | null;
  checkedAt: string;
}

interface Account {
  id: string;
  phone: string;
  fullName: string | null;
  username: string | null;
  status: string;
  banChecks: BanCheck[];
}

interface CheckResult {
  phone: string;
  ok: boolean;
  isBanned: boolean;
  reason?: string;
  limitedUntil?: string;
}

export function BanChecker({ accounts }: { accounts: Account[] }) {
  const [busy, setBusy] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, CheckResult>>({});
  const [error, setError] = useState<string | null>(null);

  const checkOne = async (phone: string) => {
    setCheckingPhone(phone);
    setError(null);
    try {
      // 25s timeout — if it takes longer, the account is likely banned
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const res = await fetch('/api/admin/ban-checker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (data.ok) {
        setResults({ ...results, [phone]: data });
      } else {
        setError(data.error || data.message || 'فشل فحص الحساب');
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        // Timeout = account is likely banned (session can't connect)
        const bannedResult = {
          ok: true,
          phone,
          isBanned: true,
          banType: 'session_invalid',
          reason: '⏱️ انتهى وقت الفحص — الجلسة غير صالحة أو الحساب محظور',
        };
        setResults({ ...results, [phone]: bannedResult });
      } else {
        setError(e.message);
      }
    } finally {
      setCheckingPhone(null);
    }
  };

  const checkAll = async () => {
    setBusy(true);
    setError(null);
    const newResults: Record<string, CheckResult> = {};
    
    // Check each account ONE BY ONE (avoids Vercel 60s timeout)
    for (const account of accounts) {
      setCheckingPhone(account.phone);
      try {
        // 25s timeout per account
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);

        const res = await fetch('/api/admin/ban-checker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: account.phone }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const data = await res.json();
        if (data.ok) {
          newResults[account.phone] = data;
        } else {
          newResults[account.phone] = { ok: false, phone: account.phone, error: data.error || 'فشل' };
        }
      } catch (e: any) {
        if (e.name === 'AbortError') {
          // Timeout = account is likely banned
          newResults[account.phone] = {
            ok: true, phone: account.phone, isBanned: true,
            banType: 'session_invalid',
            reason: '⏱️ انتهى وقت الفحص — الحساب محظور أو الجلسة غير صالحة',
          };
        } else {
          newResults[account.phone] = { ok: false, phone: account.phone, error: e.message };
        }
      }
      setResults({ ...newResults });
    }
    setCheckingPhone(null);
    setBusy(false);
  };

  if (accounts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ShieldCheck className="size-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-lg font-medium">لا توجد حسابات لفحصها</p>
          <p className="text-sm text-muted-foreground mt-1">
            أضف حساباً أولاً من <a href="/telegram-login" className="text-primary underline">صفحة تسجيل الدخول</a>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex items-center justify-between gap-3 pt-6">
          <div>
            <p className="font-medium">فحص جميع الحسابات ({accounts.length})</p>
            <p className="text-xs text-muted-foreground">يتحقق من حالة كل حساب على تيليجرام</p>
          </div>
          <Button onClick={checkAll} disabled={busy} className="gap-1.5">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            فحص الكل
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-2">
        {accounts.map((a) => {
          const result = results[a.phone];
          const lastCheck = a.banChecks[0];
          const isBanned = result?.isBanned ?? lastCheck?.isBanned;
          const isHealthy = result?.ok && !result?.isBanned;
          const reason = result?.reason ?? lastCheck?.reason;

          return (
            <Card key={a.id}>
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`size-10 rounded-full grid place-items-center ${
                    isBanned ? 'bg-red-500/10' : isHealthy ? 'bg-emerald-500/10' : 'bg-zinc-500/10'
                  }`}>
                    {isBanned ? <ShieldAlert className="size-5 text-red-500" />
                      : isHealthy ? <CheckCircle2 className="size-5 text-emerald-500" />
                      : <AlertTriangle className="size-5 text-zinc-500" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">
                      {a.fullName || a.username || a.phone}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono" dir="ltr">{a.phone}</p>
                    {reason && <p className="text-xs text-muted-foreground mt-0.5">{reason}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isBanned ? (
                    <Badge variant="destructive">محظور</Badge>
                  ) : isHealthy ? (
                    <Badge className="bg-emerald-500 hover:bg-emerald-600">سليم</Badge>
                  ) : (
                    <Badge variant="secondary">غير مفحوص</Badge>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => checkOne(a.phone)}
                    disabled={busy}
                    className="h-8"
                  >
                    {busy && !result ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
                    فحص
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

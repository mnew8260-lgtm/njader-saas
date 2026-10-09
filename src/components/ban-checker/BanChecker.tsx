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
      const res = await fetch('/api/admin/ban-checker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      // Handle non-JSON responses (Vercel timeout returns HTML)
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        // Vercel timeout — treat as potentially banned/restricted
        data = {
          ok: true,
          phone,
          isBanned: true,
          banType: 'session_invalid',
          reason: '⏱️ انتهى وقت الفحص — الحساب محظور أو الجلسة غير صالحة',
        };
      }

      setResults({ ...results, [phone]: data });
    } catch (e: any) {
      setResults({ ...results, [phone]: {
        ok: true, phone, isBanned: true,
        banType: 'session_invalid',
        reason: '⏱️ انتهى وقت الفحص — الحساب محظور أو الجلسة غير صالحة',
      }});
    } finally {
      setCheckingPhone(null);
    }
  };

  const checkAll = async () => {
    setBusy(true);
    setError(null);
    const newResults: Record<string, CheckResult> = {};

    // Check each account ONE BY ONE
    for (const account of accounts) {
      setCheckingPhone(account.phone);
      try {
        const res = await fetch('/api/admin/ban-checker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: account.phone }),
        });

        // Handle non-JSON responses (Vercel timeout returns HTML)
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          // Vercel timeout — treat as potentially banned/restricted
          data = {
            ok: true,
            phone: account.phone,
            isBanned: true,
            banType: 'session_invalid',
            reason: '⏱️ انتهى وقت الفحص — الحساب محظور أو الجلسة غير صالحة',
          };
        }

        newResults[account.phone] = data;
      } catch (e: any) {
        newResults[account.phone] = {
          ok: true, phone: account.phone, isBanned: true,
          banType: 'session_invalid',
          reason: '⏱️ انتهى وقت الفحص — الحساب محظور أو الجلسة غير صالحة',
        };
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
          const banType = result?.banType;
          const details = result?.details;

          // More nuanced status
          const isLimited = banType === 'limited' || banType === 'flood_ban';
          const isWriteBanned = banType === 'write_banned' || banType === 'spam_ban';
          const isSpamRestricted = banType === 'spam_restricted';
          const statusLabel = isBanned
            ? (isSpamRestricted ? 'مقيّد سبام' : isLimited ? 'محدود' : isWriteBanned ? 'محظور كتابة' : banType === 'deactivated' ? 'معطّل' : 'محظور')
            : isHealthy ? 'سليم' : 'غير مفحوص';
          const statusColor = isBanned
            ? (isSpamRestricted ? 'bg-orange-500 hover:bg-orange-600' : isLimited ? 'bg-amber-500 hover:bg-amber-600' : 'bg-red-500 hover:bg-red-600')
            : isHealthy ? 'bg-emerald-500 hover:bg-emerald-600' : '';

          return (
            <Card key={a.id}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`size-10 rounded-full grid place-items-center shrink-0 ${
                      isBanned
                        ? (isSpamRestricted ? 'bg-orange-500/10' : isLimited ? 'bg-amber-500/10' : 'bg-red-500/10')
                        : isHealthy ? 'bg-emerald-500/10' : 'bg-zinc-500/10'
                    }`}>
                      {isBanned
                        ? (isSpamRestricted ? <AlertTriangle className="size-5 text-orange-500" /> : isLimited ? <AlertTriangle className="size-5 text-amber-500" /> : <ShieldAlert className="size-5 text-red-500" />)
                        : isHealthy ? <CheckCircle2 className="size-5 text-emerald-500" />
                        : <AlertTriangle className="size-5 text-zinc-500" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate text-sm">
                        {a.fullName || a.username || a.phone}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono" dir="ltr">{a.phone}</p>
                      {reason && <p className="text-xs mt-0.5 ${
                        isBanned ? (isSpamRestricted ? 'text-orange-600 dark:text-orange-400' : isLimited ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400') : 'text-muted-foreground'
                      }">{reason}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={statusColor + ' text-xs'}>
                      {statusLabel}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => checkOne(a.phone)}
                      disabled={busy}
                      className="h-8"
                    >
                      {busy && checkingPhone === a.phone ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
                      فحص
                    </Button>
                  </div>
                </div>

                {/* Detailed checks */}
                {details && result?.ok && (
                  <div className="flex gap-1.5 flex-wrap mt-2 pt-2 border-t">
                    <Badge variant="outline" className={`text-[10px] ${details.canWrite === false ? 'text-red-500 border-red-500/30' : 'text-emerald-600'}`}>
                      {details.canWrite === false ? '❌ لا يكتب' : '✓ يكتب'}
                    </Badge>
                    {details.canResolve !== undefined && (
                      <Badge variant="outline" className={`text-[10px] ${details.canResolve === false ? 'text-red-500 border-red-500/30' : 'text-emerald-600'}`}>
                        {details.canResolve ? '✓ بحث' : '❌ بحث'}
                      </Badge>
                    )}
                    {details.recentFloodWaits !== undefined && (
                      <Badge variant="outline" className={`text-[10px] ${details.recentFloodWaits > 0 ? 'text-amber-600 border-amber-500/30' : 'text-emerald-600'}`}>
                        FloodWait: {details.recentFloodWaits}
                      </Badge>
                    )}
                    {details.isRestricted && (
                      <Badge variant="outline" className="text-[10px] text-orange-600 border-orange-500/30">
                        ⚠️ مقيّد سبام
                      </Badge>
                    )}
                    {details.canWriteToStranger !== undefined && !details.isRestricted && (
                      <Badge variant="outline" className="text-[10px] text-emerald-600">
                        ✓ يراسل الغرباء
                      </Badge>
                    )}
                    {details.canAddToGroups !== undefined && !details.isRestricted && (
                      <Badge variant="outline" className="text-[10px] text-emerald-600">
                        ✓ يضيف أعضاء
                      </Badge>
                    )}
                    {details.sessionsCount !== undefined && (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        جلسات: {details.sessionsCount}
                      </Badge>
                    )}
                    {details.isPremium && (
                      <Badge variant="outline" className="text-[10px] text-amber-600">⭐ Premium</Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

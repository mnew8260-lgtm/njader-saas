'use client';

import { useState } from 'react';
import {
  Loader2, ShieldAlert, ShieldCheck, RefreshCw, AlertTriangle,
  CheckCircle2, XCircle, Send,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Account {
  id: string;
  phone: string;
  fullName: string | null;
  username: string | null;
  banChecks: { isBanned: boolean; reason: string | null }[];
}

interface CheckResult {
  ok: boolean;
  phone?: string;
  isBanned?: boolean;
  banType?: string;
  reason?: string;
  details?: {
    isPremium?: boolean;
    recentPeerFloods?: number;
    recentFloodWaits?: number;
    isRestricted?: boolean;
    canWrite?: boolean;
    canAddToGroups?: boolean;
  };
  error?: string;
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
      const text = await res.text();
      let data: CheckResult;
      try { data = JSON.parse(text); }
      catch {
        data = {
          ok: true, phone, isBanned: true,
          banType: 'session_invalid',
          reason: '⏱️ انتهى وقت الفحص — الحساب محظور أو الجلسة غير صالحة',
        };
      }
      setResults({ ...results, [phone]: data });
    } catch {
      setResults({ ...results, [phone]: {
        ok: true, phone, isBanned: true,
        banType: 'session_invalid',
        reason: '⏱️ انتهى وقت الفحص',
      }});
    } finally {
      setCheckingPhone(null);
    }
  };

  const checkAll = async () => {
    setBusy(true);
    setError(null);
    const newResults: Record<string, CheckResult> = {};
    for (const account of accounts) {
      setCheckingPhone(account.phone);
      try {
        const res = await fetch('/api/admin/ban-checker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: account.phone }),
        });
        const text = await res.text();
        let data: CheckResult;
        try { data = JSON.parse(text); }
        catch {
          data = {
            ok: true, phone: account.phone, isBanned: true,
            banType: 'session_invalid',
            reason: '⏱️ انتهى وقت الفحص — الحساب محظور أو الجلسة غير صالحة',
          };
        }
        newResults[account.phone] = data;
      } catch {
        newResults[account.phone] = {
          ok: true, phone: account.phone, isBanned: true,
          banType: 'session_invalid',
          reason: '⏱️ انتهى وقت الفحص',
        };
      }
      setResults({ ...newResults });
    }
    setCheckingPhone(null);
    setBusy(false);
  };

  // Deep check: walk @SpamBot conversation
  const deepCheck = async (phone: string) => {
    setCheckingPhone(phone);
    try {
      const res = await fetch('/api/admin/ban-checker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, mode: 'deep' }),
      });
      const text = await res.text();
      let data: CheckResult;
      try { data = JSON.parse(text); }
      catch { data = { ok: false, error: 'فشل @SpamBot' }; }
      setResults({ ...results, [phone]: data });
    } catch {
      setError('فشل الاتصال');
    } finally {
      setCheckingPhone(null);
    }
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
            <p className="text-xs text-muted-foreground">فحص سريع (getMe) — يكشف: معطّل / جلسة منتهية / PEER_FLOOD</p>
          </div>
          <Button onClick={checkAll} disabled={busy} className="gap-1.5">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            فحص الكل
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
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

          const isLimited = banType === 'limited' || banType === 'flood_ban';
          const isSpamRestricted = banType === 'spam_restricted';
          const statusLabel = isBanned
            ? (isSpamRestricted ? 'مقيّد سبام' : isLimited ? 'محدود' : banType === 'deactivated' ? 'معطّل' : banType === 'auth_failed' ? 'جلسة منتهية' : 'محظور')
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
                      <p className="font-medium truncate text-sm">{a.fullName || a.username || a.phone}</p>
                      <p className="text-xs text-muted-foreground font-mono" dir="ltr">{a.phone}</p>
                      {reason && <p className="text-xs mt-0.5 ${
                        isBanned ? (isSpamRestricted ? 'text-orange-600 dark:text-orange-400' : isLimited ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400') : 'text-muted-foreground'
                      }">{reason}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={statusColor + ' text-xs'}>{statusLabel}</Badge>
                    <Button size="sm" variant="outline" onClick={() => checkOne(a.phone)} disabled={busy} className="h-8">
                      {busy && checkingPhone === a.phone ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
                      فحص
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deepCheck(a.phone)} disabled={busy} className="h-8 text-purple-600" title="فحص عميق عبر @SpamBot">
                      {busy && checkingPhone === a.phone ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
                    </Button>
                  </div>
                </div>

                {details && result?.ok && (
                  <div className="flex gap-1.5 flex-wrap mt-2 pt-2 border-t">
                    {details.isPremium && <Badge variant="outline" className="text-[10px] text-amber-600">⭐ Premium</Badge>}
                    {details.recentPeerFloods !== undefined && details.recentPeerFloods > 0 && (
                      <Badge variant="outline" className="text-[10px] text-orange-600 border-orange-500/30">
                        PEER_FLOOD: {details.recentPeerFloods}
                      </Badge>
                    )}
                    {details.recentFloodWaits !== undefined && details.recentFloodWaits > 0 && (
                      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">
                        FloodWait: {details.recentFloodWaits}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-muted/30">
        <CardContent className="py-4 space-y-2">
          <p className="text-xs text-muted-foreground">
            💡 <strong>فحص سريع</strong> (🔄): getMe فقط — يكشف المعطّل والجلسات المنتهية + PEER_FLOOD من التاريخ
          </p>
          <p className="text-xs text-muted-foreground">
            🔬 <strong>فحص عميق</strong> (📤): محادثة @SpamBot كاملة — يكشف التقييد + يرسل شكوى تلقائياً
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

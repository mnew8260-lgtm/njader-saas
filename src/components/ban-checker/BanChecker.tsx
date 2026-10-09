'use client';

import { useState } from 'react';
import {
  Loader2, ShieldAlert, ShieldCheck, RefreshCw, AlertTriangle,
  CheckCircle2, Send,
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
  };
  error?: string;
}

export function BanChecker({ accounts }: { accounts: Account[] }) {
  const [busy, setBusy] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, CheckResult>>({});
  const [deepBusy, setDeepBusy] = useState<string | null>(null);
  const [deepStatus, setDeepStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Quick check: getMe only (2-3s, fits Vercel)
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
        data = { ok: true, phone, isBanned: true, banType: 'session_invalid', reason: '⏱️ انتهى وقت الفحص' };
      }
      setResults(prev => ({ ...prev, [phone]: data }));
    } catch {
      setResults(prev => ({ ...prev, [phone]: { ok: true, phone, isBanned: true, banType: 'session_invalid', reason: '⏱️ فشل الاتصال' } }));
    } finally {
      setCheckingPhone(null);
    }
  };

  const checkAll = async () => {
    setBusy(true);
    setError(null);
    for (const account of accounts) {
      await checkOne(account.phone);
    }
    setBusy(false);
  };

  // Deep check: 3 sequential API calls (each <8s, fits Vercel 10s)
  const deepCheck = async (phone: string) => {
    setDeepBusy(phone);
    setDeepStatus('الاتصال بـ @SpamBot...');

    try {
      // Step 1: Send /start to @SpamBot (~3s)
      setDeepStatus('إرسال /start...');
      const r1 = await fetch('/api/telegram/spambot-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const d1 = await r1.json().catch(() => ({ ok: false }));
      if (!d1.ok) {
        setResults(prev => ({ ...prev, [phone]: { ok: true, phone, isBanned: true, banType: 'session_invalid', reason: '⚠️ فشل الاتصال بـ @SpamBot' } }));
        setDeepBusy(null);
        setDeepStatus(null);
        return;
      }

      // Wait 2s for @SpamBot to respond
      setDeepStatus('قراءة رد @SpamBot...');
      await new Promise(r => setTimeout(r, 2000));

      // Step 2: Read @SpamBot response (~2s)
      const r2 = await fetch('/api/telegram/spambot-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const d2 = await r2.json().catch(() => ({ ok: false, status: 'unknown' }));

      if (!d2.ok) {
        setResults(prev => ({ ...prev, [phone]: { ok: true, phone, isBanned: false, reason: '⚠️ تعذّر قراءة رد @SpamBot' } }));
        setDeepBusy(null);
        setDeepStatus(null);
        return;
      }

      // Step 3: If restricted → submit complaint (~5s)
      if (d2.isRestricted || d2.status === 'restricted') {
        setDeepStatus('مقيّد! إرسال شكوى تلقائية...');
        const r3 = await fetch('/api/telegram/spambot-complain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone }),
        });
        const d3 = await r3.json().catch(() => ({ ok: false }));

        setResults(prev => ({ ...prev, [phone]: {
          ok: true, phone, isBanned: true,
          banType: 'spam_restricted',
          reason: d3.ok ? '🟠 مقيّد سبام — تم إرسال شكوى تلقائياً ✅' : '🟠 مقيّد سبام — فشل إرسال الشكوى',
        }}));
      } else if (d2.isClean || d2.status === 'clean') {
        setResults(prev => ({ ...prev, [phone]: {
          ok: true, phone, isBanned: false,
          reason: '✅ سليم — @SpamBot أكد: لا توجد قيود',
        }}));
      } else if (d2.isBanned || d2.status === 'banned') {
        setResults(prev => ({ ...prev, [phone]: {
          ok: true, phone, isBanned: true,
          banType: 'deactivated',
          reason: '🚫 محظور نهائياً (حسب @SpamBot)',
        }}));
      } else {
        setResults(prev => ({ ...prev, [phone]: {
          ok: true, phone, isBanned: false,
          reason: '✅ سليم — @SpamBot لم يبلغ عن قيود',
        }}));
      }
    } catch {
      setError('فشل الفحص العميق');
    } finally {
      setDeepBusy(null);
      setDeepStatus(null);
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
            <p className="text-xs text-muted-foreground">فحص سريع — يكشف: معطّل / جلسة منتهية / PEER_FLOOD</p>
          </div>
          <Button onClick={checkAll} disabled={busy} className="gap-1.5">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            فحص الكل
          </Button>
        </CardContent>
      </Card>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      <div className="grid gap-2">
        {accounts.map((a) => {
          const result = results[a.phone];
          const lastCheck = a.banChecks[0];
          const isBanned = result?.isBanned ?? lastCheck?.isBanned;
          const isHealthy = result?.ok && !result?.isBanned;
          const reason = result?.reason ?? lastCheck?.reason;
          const banType = result?.banType;
          const details = result?.details;
          const isSpam = banType === 'spam_restricted';
          const isLimited = banType === 'limited';

          const statusLabel = isBanned
            ? (isSpam ? 'مقيّد سبام' : isLimited ? 'محدود' : banType === 'deactivated' ? 'معطّل' : 'محظور')
            : isHealthy ? 'سليم' : 'غير مفحوص';
          const statusColor = isBanned
            ? (isSpam ? 'bg-orange-500' : isLimited ? 'bg-amber-500' : 'bg-red-500')
            : isHealthy ? 'bg-emerald-500' : '';

          return (
            <Card key={a.id}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`size-10 rounded-full grid place-items-center shrink-0 ${
                      isBanned ? (isSpam ? 'bg-orange-500/10' : isLimited ? 'bg-amber-500/10' : 'bg-red-500/10')
                      : isHealthy ? 'bg-emerald-500/10' : 'bg-zinc-500/10'
                    }`}>
                      {isBanned ? (isSpam ? <AlertTriangle className="size-5 text-orange-500" /> : <ShieldAlert className="size-5 text-red-500" />)
                      : isHealthy ? <CheckCircle2 className="size-5 text-emerald-500" />
                      : <AlertTriangle className="size-5 text-zinc-500" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate text-sm">{a.fullName || a.username || a.phone}</p>
                      <p className="text-xs text-muted-foreground font-mono" dir="ltr">{a.phone}</p>
                      {reason && <p className={`text-xs mt-0.5 ${isBanned ? (isSpam ? 'text-orange-600' : 'text-red-600') : 'text-muted-foreground'}`}>{reason}</p>}
                      {deepBusy === a.phone && deepStatus && <p className="text-xs text-purple-600 mt-0.5">🔬 {deepStatus}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={statusColor + ' text-xs'}>{statusLabel}</Badge>
                    <Button size="sm" variant="outline" onClick={() => checkOne(a.phone)} disabled={busy || !!deepBusy} className="h-8">
                      {busy && checkingPhone === a.phone ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deepCheck(a.phone)} disabled={busy || !!deepBusy} className="h-8 text-purple-600" title="فحص عميق @SpamBot">
                      {deepBusy === a.phone ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-muted/30">
        <CardContent className="py-4 space-y-1">
          <p className="text-xs text-muted-foreground">🔄 <strong>فحص سريع:</strong> getMe — يكشف المعطّل + PEER_FLOOD</p>
          <p className="text-xs text-muted-foreground">📤 <strong>فحص عميق:</strong> @SpamBot كامل — يكشف التقييد + يرسل شكوى (3 طلبات × 3s)</p>
        </CardContent>
      </Card>
    </div>
  );
}

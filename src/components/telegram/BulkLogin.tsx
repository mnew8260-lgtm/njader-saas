'use client';

import { useState } from 'react';
import {
  Loader2, Users, Send, CheckCircle2, XCircle, Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BulkResult {
  phone: string;
  status: string;
  message: string;
  next_step?: string;
}

export function BulkLogin() {
  const [phones, setPhones] = useState('');
  const [busy, setBusy] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [results, setResults] = useState<BulkResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Verify section
  const [verifyPhone, setVerifyPhone] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

  const phoneList = phones.split('\n').map((p) => {
    let phone = p.trim();
    if (!phone) return '';
    if (!phone.startsWith('+')) phone = '+' + phone.replace(/\D/g, '');
    return phone;
  }).filter(Boolean);

  const sendBulkCodes = async () => {
    if (phoneList.length === 0) return;

    setBusy(true);
    setError(null);
    setResults([]);
    setCurrentIdx(0);

    const allResults: BulkResult[] = [];

    // Send code to each phone ONE BY ONE (avoids Vercel 10s timeout)
    for (let i = 0; i < phoneList.length; i++) {
      setCurrentIdx(i);
      const phone = phoneList[i];

      try {
        const res = await fetch('/api/telegram/send-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone }),
        });

        // Handle non-JSON responses (Vercel errors)
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          data = { ok: false, error: 'SERVER_ERROR', message: text.substring(0, 100) || 'استجابة غير صالحة من الخادم' };
        }

        if (data.ok) {
          allResults.push({
            phone: data.phone || phone,
            status: data.status,
            message: data.message || '',
            next_step: data.next_step,
          });
        } else {
          allResults.push({
            phone,
            status: 'error',
            message: data.message || data.error || 'فشل',
          });
        }
      } catch (e: any) {
        allResults.push({
          phone,
          status: 'error',
          message: e.message || 'خطأ في الاتصال',
        });
      }

      setResults([...allResults]);

      // Small delay between phones (only if not the last one)
      if (i < phoneList.length - 1) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    setCurrentIdx(-1);
    setBusy(false);
  };

  const codeSentCount = results.filter((r) => r.status === 'code_sent').length;
  const alreadyCount = results.filter((r) => r.status === 'already_logged_in').length;
  const errorCount = results.filter((r) => r.status === 'error').length;

  const verifyCodeNow = async () => {
    setVerifyBusy(true);
    setVerifyResult(null);
    try {
      const res = await fetch('/api/telegram/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: verifyPhone, code: verifyCode }),
      });
      const data = await res.json();
      if (data.ok) {
        if (data.status === 'logged_in') {
          setVerifyResult(`✅ تم تسجيل دخول ${verifyPhone} بنجاح! (${data.user?.first_name || ''})`);
          // Update results to mark this phone as logged in
          setResults(results.map((r) =>
            r.phone === verifyPhone ? { ...r, status: 'logged_in', message: 'تم تسجيل الدخول ✓' } : r
          ));
        } else if (data.status === '2fa_required') {
          setVerifyResult(`🔐 هذا الحساب يحتاج كلمة مرور ثنائية (2FA). ستحتاج لإدخالها يدوياً.`);
        }
        setVerifyCode('');
      } else {
        setVerifyResult(`❌ ${data.error || data.message || 'فشل'}`);
      }
    } catch (e: any) {
      setVerifyResult(`❌ ${e.message}`);
    } finally {
      setVerifyBusy(false);
    }
  };

  return (
    <Card className="border-purple-500/30">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="size-4" /> دخول جماعي — أضف عدة حسابات دفعة واحدة
        </CardTitle>
        <CardDescription>
          أدخل عدة أرقام هاتف (واحد لكل سطر) — سيُرسل كود لكل رقم تلقائياً
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label>أرقام الهواتف (مع رمز الدولة)</Label>
          <Textarea
            placeholder={'+9665xxxxxxx\n+9715xxxxxxx\n+9677xxxxxxx'}
            value={phones}
            onChange={(e) => setPhones(e.target.value)}
            dir="ltr"
            className="font-mono text-sm"
            rows={6}
            disabled={busy}
          />
          <p className="text-xs text-muted-foreground">
            {phoneList.length} رقم جاهز · الحد الأقصى 10 · سيتم إضافة + تلقائياً
          </p>
        </div>

        <Button
          onClick={sendBulkCodes}
          disabled={busy || phoneList.length === 0}
          className="w-full gap-2"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          {busy ? `جاري إرسال الكود للرقم ${currentIdx + 1} من ${phoneList.length}...` : 'إرسال أكواد لكل الأرقام'}
        </Button>

        {/* Progress bar */}
        {busy && (
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-2 transition-all duration-300"
              style={{ width: `${((currentIdx + 1) / phoneList.length) * 100}%` }}
            />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary">📊 {results.length} / {phoneList.length}</Badge>
              {codeSentCount > 0 && (
                <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                  ✅ {codeSentCount} كود مرسل
                </Badge>
              )}
              {alreadyCount > 0 && (
                <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400">
                  ✓ {alreadyCount} مسجل مسبقاً
                </Badge>
              )}
              {errorCount > 0 && (
                <Badge className="bg-red-500/20 text-red-700 dark:text-red-400">
                  ❌ {errorCount} فشل
                </Badge>
              )}
            </div>

            <div className="space-y-1 max-h-48 overflow-y-auto">
              {results.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 p-2 rounded-md text-xs ${
                    r.status === 'code_sent' ? 'bg-emerald-500/10' :
                    r.status === 'already_logged_in' ? 'bg-blue-500/10' :
                    r.status === 'logged_in' ? 'bg-emerald-500/20' :
                    'bg-red-500/10'
                  }`}
                >
                  {r.status === 'code_sent' ? <Clock className="size-3.5 text-amber-500" /> :
                   r.status === 'already_logged_in' ? <CheckCircle2 className="size-3.5 text-blue-500" /> :
                   r.status === 'logged_in' ? <CheckCircle2 className="size-3.5 text-emerald-500" /> :
                   <XCircle className="size-3.5 text-red-500" />}
                  <span className="font-mono" dir="ltr">{r.phone}</span>
                  <span className="text-muted-foreground truncate flex-1">{r.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Verify code section */}
        {codeSentCount > 0 && (
          <div className="space-y-3 pt-3 border-t">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-amber-500" />
              <p className="text-sm font-medium">أدخل الأكواد المستلمة</p>
            </div>
            <p className="text-xs text-muted-foreground">
              اختر رقم، أدخل الكود الذي وصلك في تيليجرام، ثم اضغط "تحقق"
            </p>

            <div className="space-y-2">
              {/* Quick select: show only phones that got codes (not yet logged in) */}
              <div className="flex gap-1 flex-wrap">
                {results.filter((r) => r.status === 'code_sent').map((r, i) => (
                  <button
                    key={i}
                    onClick={() => { setVerifyPhone(r.phone); setVerifyResult(null); }}
                    className={`px-2 py-1 rounded-md text-xs font-mono transition ${
                      verifyPhone === r.phone
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/70'
                    }`}
                    dir="ltr"
                  >
                    {r.phone}
                  </button>
                ))}
              </div>

              {verifyPhone && (
                <div className="flex gap-2">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="12345"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="font-mono text-2xl tracking-[0.3em] text-center"
                    dir="ltr"
                  />
                  <Button
                    onClick={verifyCodeNow}
                    disabled={verifyBusy || verifyCode.length < 5}
                    className="gap-1.5 shrink-0"
                  >
                    {verifyBusy ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                    تحقق
                  </Button>
                </div>
              )}

              {verifyResult && (
                <Alert className={verifyResult.startsWith('✅') ? 'bg-emerald-500/10 border-emerald-500/30' : ''}>
                  <AlertDescription className="text-sm">{verifyResult}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

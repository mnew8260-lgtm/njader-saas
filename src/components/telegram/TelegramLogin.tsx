'use client';

/**
 * TelegramLogin.tsx — Vercel-compatible React component
 * =====================================================
 *
 * Multi-step Telegram login (PHONE-ONLY):
 *   1. phone → send_code
 *   2. code → verify_code
 *   3. (optional) password → verify_password
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Phone, KeyRound, Lock, Loader2, CheckCircle2, AlertCircle,
  RefreshCw, ArrowLeft, ArrowRight, ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

type Step = 'phone' | 'code' | 'password' | 'success' | 'error';

interface UserInfo {
  id?: string;
  first_name?: string;
  username?: string;
}

interface ApiResponse {
  ok: boolean;
  status?: string;
  error?: string;
  message?: string;
  phone?: string;
  phone_code_hash?: string;
  next_step?: 'verify_code' | 'verify_password';
  user?: UserInfo;
}

export function TelegramLogin({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('+');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [user, setUser] = useState<UserInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetFlow = () => {
    setStep('phone');
    setCode('');
    setPassword('');
    setPhoneCodeHash('');
    setUser(null);
    setError(null);
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/telegram/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data: ApiResponse = await res.json();

      if (!data.ok) {
        setError(data.message || data.error || 'فشل إرسال الكود');
        setStep('error');
        return;
      }

      if (data.status === 'already_logged_in') {
        setUser(data.user || null);
        setStep('success');
        return;
      }

      setPhoneCodeHash(data.phone_code_hash || '');
      setPhone(data.phone || phone);
      setStep('code');
    } catch (e: any) {
      setError(e.message);
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/telegram/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, phone_code_hash: phoneCodeHash }),
      });
      const data: ApiResponse = await res.json();

      if (!data.ok) {
        setError(data.message || data.error || 'فشل التحقق');
        return;
      }

      if (data.status === '2fa_required') {
        setStep('password');
        return;
      }

      if (data.status === 'logged_in') {
        setUser(data.user || null);
        setStep('success');
        return;
      }
    } catch (e: any) {
      setError(e.message);
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/telegram/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });
      const data: ApiResponse = await res.json();

      if (!data.ok) {
        setError(data.message || data.error || 'كلمة المرور غير صحيحة');
        return;
      }

      if (data.status === 'logged_in') {
        setUser(data.user || null);
        setStep('success');
        return;
      }
    } catch (e: any) {
      setError(e.message);
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setStep('phone');
    setCode('');
    setError(null);
    setTimeout(() => {
      const form = document.getElementById('phone-form') as HTMLFormElement | null;
      form?.requestSubmit();
    }, 100);
  };

  const progress = step === 'phone' ? 5 : step === 'code' ? 50 : step === 'password' ? 75 : step === 'success' ? 100 : 5;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Phone className="h-5 w-5 text-primary" />
              تسجيل دخول تيليجرام
            </CardTitle>
            <CardDescription className="text-xs">
              خطوة بخطوة · آمن · يعمل على Vercel
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">{progress}%</Badge>
        </div>
        <Progress value={progress} className="h-1" />
      </CardHeader>

      <CardContent className="space-y-4">
        {step === 'phone' && (
          <form id="phone-form" onSubmit={handleSendCode} className="space-y-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> رقم الهاتف
              </Label>
              <Input
                type="tel"
                dir="ltr"
                placeholder="+963999123456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="font-mono text-lg"
                required
                autoFocus
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                أدخل رقمك مع رمز الدولة. النظام يستخدم pool من الـ API credentials — لا داعي لإدخال api_id أو api_hash.
              </p>
            </div>
            <Button type="submit" className="w-full gap-1.5" disabled={loading || phone.length < 8}>
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> جاري إرسال الكود…</>
              ) : (
                <><ArrowLeft className="h-4 w-4" /> إرسال كود التحقق</>
              )}
            </Button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={handleVerifyCode} className="space-y-3">
            <Alert className="bg-emerald-500/10 border-emerald-500/30">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <AlertDescription className="text-emerald-700 dark:text-emerald-400">
                تم إرسال كود التحقق إلى تيليجرام على الرقم <span className="font-mono" dir="ltr">{phone}</span>
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5" /> كود التحقق
              </Label>
              <Input
                type="text"
                inputMode="numeric"
                dir="ltr"
                placeholder="12345"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="font-mono text-2xl tracking-[0.3em] text-center"
                required
                autoFocus
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                أدخل الكود المكوّن من 5 أرقام الذي وصلك في تطبيق تيليجرام.
              </p>
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep('phone')} className="gap-1" disabled={loading}>
                <ArrowRight className="h-4 w-4" /> رجوع
              </Button>
              <Button type="submit" className="flex-1 gap-1.5" disabled={loading || code.length < 5}>
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> تحقق…</>
                ) : (
                  <><ShieldCheck className="h-4 w-4" /> تحقق</>
                )}
              </Button>
            </div>
            <button
              type="button"
              onClick={handleResend}
              className="text-xs text-primary underline w-full text-center"
              disabled={loading}
            >
              لم يصلك الكود؟ أعد الإرسال
            </button>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={handleVerifyPassword} className="space-y-3">
            <Alert className="bg-amber-500/10 border-amber-500/30">
              <Lock className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                هذا الحساب مُفعّل عليه التحقق الثنائي (2FA). أدخل كلمة المرور الثنائية.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" /> كلمة المرور الثنائية
              </Label>
              <Input
                type="password"
                dir="ltr"
                placeholder="•••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="font-mono"
                required
                autoFocus
                disabled={loading}
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep('code')} className="gap-1" disabled={loading}>
                <ArrowRight className="h-4 w-4" /> رجوع
              </Button>
              <Button type="submit" className="flex-1 gap-1.5" disabled={loading || !password}>
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> تحقق…</>
                ) : (
                  <><Lock className="h-4 w-4" /> تأكيد</>
                )}
              </Button>
            </div>
          </form>
        )}

        {step === 'success' && user && (
          <div className="space-y-4 text-center py-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <div>
              <p className="text-lg font-bold">تم تسجيل الدخول بنجاح ✓</p>
              <p className="text-sm text-muted-foreground">
                {user.first_name ? `مرحباً ${user.first_name}` : 'مرحباً'} — {user.username ? `@${user.username}` : phone}
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => { onDone?.(); router.push('/accounts'); }} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" /> الذهاب لحساباتي
              </Button>
              <Button variant="outline" onClick={resetFlow} className="gap-1.5">
                <RefreshCw className="h-4 w-4" /> حساب آخر
              </Button>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="space-y-4 text-center py-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <div>
              <p className="text-lg font-bold">فشل تسجيل الدخول</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button onClick={resetFlow} variant="outline" className="gap-1.5">
              <RefreshCw className="h-4 w-4" /> المحاولة مرة أخرى
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * ApiPoolManager — Vercel-compatible component for owner
 */
export function ApiPoolManager() {
  const [pool, setPool] = useState<Array<{ api_id: string; api_hash_masked: string; label: string; enabled: boolean; usedCount: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ api_id: '', api_hash: '', label: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/admin/api-pool/list', { cache: 'no-store' });
      const data = await r.json();
      if (data.ok) setPool(data.pool || []);
      else setError(data.error);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const r = await fetch('/api/admin/api-pool/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await r.json();
      if (data.ok) {
        setForm({ api_id: '', api_hash: '', label: '' });
        refresh();
      } else {
        setError(data.message || data.error);
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (apiId: string) => {
    if (!confirm(`حذف API ${apiId}؟`)) return;
    await fetch('/api/admin/api-pool/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_id: apiId }),
    });
    refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <KeyRound className="h-4 w-4" /> API Pool Manager
        </CardTitle>
        <CardDescription>
          المالك فقط · احصل على api_id/api_hash من{' '}
          <a href="https://my.telegram.org/apps" target="_blank" rel="noreferrer" className="text-primary underline">
            my.telegram.org/apps
          </a>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-4"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>
        ) : (
          <>
            {pool.length === 0 ? (
              <Alert className="bg-amber-500/10 border-amber-500/30">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  الـ pool فارغ. لن يتمكن المستخدمون من تسجيل الدخول حتى تضيف API واحد على الأقل.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                {pool.map((entry) => (
                  <div key={entry.api_id} className="flex items-center justify-between p-2 rounded-md border">
                    <div className="font-mono text-xs">
                      <span className="text-primary">api_id:</span> {entry.api_id}
                      <span className="mx-2 text-muted-foreground">|</span>
                      <span className="text-primary">hash:</span> {entry.api_hash_masked}
                      {entry.label && <span className="ml-2 text-muted-foreground">({entry.label})</span>}
                      <span className="ml-2 text-xs text-muted-foreground">used: {entry.usedCount}×</span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => remove(entry.api_id)} className="text-red-500 h-7">
                      حذف
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={add} className="space-y-3 pt-3 border-t">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">api_id</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    dir="ltr"
                    placeholder="1234567"
                    value={form.api_id}
                    onChange={(e) => setForm({ ...form, api_id: e.target.value })}
                    className="font-mono"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs">api_hash</Label>
                  <Input
                    type="text"
                    dir="ltr"
                    placeholder="abcdef1234..."
                    value={form.api_hash}
                    onChange={(e) => setForm({ ...form, api_hash: e.target.value })}
                    className="font-mono"
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs">label (اختياري)</Label>
                  <Input
                    type="text"
                    placeholder="njadder-Personal"
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                  />
                </div>
              </div>
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              <Button type="submit" disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                إضافة API
              </Button>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}

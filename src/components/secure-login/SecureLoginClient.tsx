'use client';

import { useState } from 'react';
import {
  Loader2, Shield, ShieldAlert, ShieldCheck, Lock, Unlock,
  KeyRound, Computer, LogOut, RefreshCw, Mail, AlertCircle,
  CheckCircle2, XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Account {
  id: string;
  phone: string;
  fullName: string | null;
  username: string | null;
}

export function SecureLoginClient({ accounts }: { accounts: Account[] }) {
  const [selectedAccount, setSelectedAccount] = useState(accounts[0]?.id || '');
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 2FA setup state
  const [newPassword, setNewPassword] = useState('');
  const [newHint, setNewHint] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');

  // 2FA change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [changedPassword, setChangedPassword] = useState('');
  const [changedHint, setChangedHint] = useState('');

  // Sessions
  const [sessions, setSessions] = useState<any[] | null>(null);

  const runCommand = async (commandId: string, params: Record<string, any> = {}) => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    setOutput('');
    try {
      const res = await fetch('/api/commands/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccount, commandId, params }),
      });
      const data = await res.json();
      if (data.ok) {
        setOutput(data.output || '(تم بنجاح)');
        setSuccess('✓ تم تنفيذ العملية بنجاح');
      } else {
        setError(data.error || data.message || 'فشل التنفيذ');
        if (data.output) setOutput(data.output);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const loadSessions = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/commands/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccount, commandId: 'secure_login_sessions', params: {} }),
      });
      const data = await res.json();
      if (data.ok) {
        setOutput(data.output || '');
        // Try to parse sessions from output
        try {
          const lines = (data.output || '').split('\n').filter((l: string) => l.trim());
          setSessions(lines.map((l: string, i: number) => ({ id: i, info: l })));
        } catch {
          setSessions(null);
        }
      } else {
        setError(data.error || 'فشل تحميل الجلسات');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const terminateSession = async (hash: string) => {
    if (!confirm('هل أنت متأكد من إنهاء هذه الجلسة؟')) return;
    await runCommand('secure_login_terminate', { sessionHash: hash });
    loadSessions();
  };

  return (
    <div className="space-y-4">
      {/* Account selector */}
      <Card>
        <CardContent className="pt-6">
          <Label className="text-sm mb-2 block">اختر الحساب</Label>
          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.fullName || a.username || a.phone} · {a.phone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Tabs defaultValue="status">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="status" className="text-xs">📊 الحالة</TabsTrigger>
          <TabsTrigger value="setup" className="text-xs">🔐 تفعيل</TabsTrigger>
          <TabsTrigger value="change" className="text-xs">🔑 تغيير</TabsTrigger>
          <TabsTrigger value="sessions" className="text-xs">💻 الجلسات</TabsTrigger>
        </TabsList>

        {/* STATUS */}
        <TabsContent value="status">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="size-4" /> حالة التسجيل الآمن
              </CardTitle>
              <CardDescription>عرض حالة 2FA، التلميح، بريد الاستعادة</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => runCommand('secure_login_status')} disabled={busy} className="gap-1.5">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Shield className="size-4" />}
                فحص حالة 2FA
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SETUP */}
        <TabsContent value="setup">
          <Card className="border-amber-500/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="size-4" /> تفعيل التحقق الثنائي (2FA)
              </CardTitle>
              <CardDescription>
                تفعيل كلمة مرور إضافية لحماية حسابك — لن يستطيع أحد الدخول بدونها
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Alert variant="default">
                <AlertCircle className="size-4" />
                <AlertDescription className="text-xs">
                  ⚠️ احفظ كلمة المرور في مكان آمن. إذا فقدتها، ستحتاج بريد الاستعادة لاستعادتها.
                </AlertDescription>
              </Alert>
              <div>
                <Label>كلمة مرور 2FA</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  dir="ltr"
                />
              </div>
              <div>
                <Label>تلميح (اختياري)</Label>
                <Input
                  placeholder="تلميح يساعدك على التذكر"
                  value={newHint}
                  onChange={(e) => setNewHint(e.target.value)}
                />
              </div>
              <div>
                <Label>بريد الاستعادة (اختياري لكن موصى به)</Label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  dir="ltr"
                />
              </div>
              <Button
                onClick={() => runCommand('secure_login_setup', {
                  password: newPassword,
                  hint: newHint,
                  recoveryEmail,
                })}
                disabled={busy || !newPassword}
                className="gap-1.5 bg-amber-600 hover:bg-amber-700"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
                تفعيل 2FA الآن
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CHANGE */}
        <TabsContent value="change">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="size-4" /> تغيير كلمة مرور 2FA
              </CardTitle>
              <CardDescription>تحديث كلمة المرور الحالية بكلمة جديدة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>كلمة المرور الحالية</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  dir="ltr"
                />
              </div>
              <div>
                <Label>كلمة المرور الجديدة</Label>
                <Input
                  type="password"
                  value={changedPassword}
                  onChange={(e) => setChangedPassword(e.target.value)}
                  dir="ltr"
                />
              </div>
              <div>
                <Label>تلميح جديد (اختياري)</Label>
                <Input value={changedHint} onChange={(e) => setChangedHint(e.target.value)} />
              </div>
              <Button
                onClick={() => runCommand('secure_login_change', {
                  currentPassword,
                  newPassword: changedPassword,
                  newHint: changedHint,
                })}
                disabled={busy || !currentPassword || !changedPassword}
                className="gap-1.5"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                تحديث كلمة المرور
              </Button>
              <div className="pt-3 border-t">
                <Button
                  onClick={() => runCommand('secure_login_disable', { currentPassword })}
                  variant="destructive"
                  disabled={busy || !currentPassword}
                  className="gap-1.5"
                >
                  <Unlock className="size-4" /> تعطيل 2FA (محذوف!)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SESSIONS */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Computer className="size-4" /> الجلسات النشطة
              </CardTitle>
              <CardDescription>عرض كل الأجهزة المسجلة دخولها على حسابك</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button onClick={loadSessions} disabled={busy} variant="outline" className="gap-1.5">
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                  تحميل الجلسات
                </Button>
                <Button
                  onClick={() => runCommand('secure_login_terminate_all')}
                  disabled={busy}
                  variant="destructive"
                  className="gap-1.5"
                >
                  <LogOut className="size-4" /> إنهاء كل الجلسات الأخرى
                </Button>
              </div>

              {sessions && sessions.length > 0 && (
                <div className="space-y-1 pt-3 border-t">
                  <Label className="text-xs">الجلسات النشطة ({sessions.length}):</Label>
                  {sessions.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between p-2 rounded border text-xs">
                      <span className="font-mono truncate">{s.info}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => terminateSession(String(s.id))}
                        className="text-red-500 h-7"
                      >
                        إنهاء
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Output */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="bg-emerald-500/10 border-emerald-500/30">
          <CheckCircle2 className="size-4 text-emerald-500" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      {output && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">المخرجات</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-zinc-950 text-zinc-100 p-3 rounded-md text-xs overflow-x-auto max-h-96 overflow-y-auto font-mono" dir="ltr">
              {output}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

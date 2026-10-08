'use client';

import { useState, useEffect } from 'react';
import {
  Loader2, Plus, Trash2, Wifi, WifiOff, Globe, Activity, Link2,
  Upload, FileText, TestTube, RefreshCw, CheckCircle2, XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface Proxy {
  id: string;
  type: string;
  host: string;
  port: number;
  country: string | null;
  enabled: boolean;
  isWorking: boolean;
  latency: number | null;
  usedCount: number;
  failCount: number;
  lastChecked: string | null;
  assignedAccounts: { phone: string; fullName: string | null }[];
}

interface Account {
  id: string;
  phone: string;
  fullName: string | null;
  username: string | null;
}

export function ProxyManager({ accounts }: { accounts: Account[] }) {
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ type: 'socks5', host: '', port: 1080, username: '', password: '', country: '' });
  const [importText, setImportText] = useState('');
  const [importType, setImportType] = useState('auto');
  const [testAllBusy, setTestAllBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/proxy', { cache: 'no-store' });
      const data = await res.json();
      if (data.ok) setProxies(data.proxies);
      else setError(data.error);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          host: form.host,
          port: Number(form.port),
          username: form.username || undefined,
          password: form.password || undefined,
          country: form.country || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setShowForm(false);
        setForm({ type: 'socks5', host: '', port: 1080, username: '', password: '', country: '' });
        load();
        setFeedback('✅ تمت إضافة البروكسي بنجاح');
      } else setError(data.error || data.message);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const importProxies = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/proxy/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: importText, defaultType: importType }),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedback(data.message);
        setImportText('');
        setShowImport(false);
        load();
      } else setError(data.error);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('حذف هذا البروكسي؟ سيتم إزالته من كل الحسابات المرتبطة به.')) return;
    await fetch(`/api/admin/proxy/${id}`, { method: 'DELETE' });
    load();
  };

  const test = async (id: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/proxy/${id}/test`, { method: 'POST' });
      const data = await res.json();
      if (!data.ok) setError(`فشل: ${data.error || 'unknown'}`);
      else setFeedback(data.ok ? `✅ البروكسي يعمل (${data.latency}ms)` : `❌ لا يعمل: ${data.error}`);
      load();
    } finally {
      setBusy(false);
    }
  };

  const testAll = async () => {
    setTestAllBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/proxy/test-all', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setFeedback(`✅ تم اختبار ${data.total} بروكسي — يعمل: ${data.working} · لا يعمل: ${data.notWorking}`);
        load();
      } else setError(data.error);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setTestAllBusy(false);
    }
  };

  const workingCount = proxies.filter((p) => p.isWorking).length;
  const assignedCount = proxies.filter((p) => p.assignedAccounts.length > 0).length;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="list">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="list" className="text-xs">📋 القائمة ({proxies.length})</TabsTrigger>
          <TabsTrigger value="add" className="text-xs">➕ إضافة</TabsTrigger>
          <TabsTrigger value="import" className="text-xs">📥 استيراد جماعي</TabsTrigger>
        </TabsList>

        {/* LIST */}
        <TabsContent value="list">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium">البروكسيات ({proxies.length})</p>
                  <p className="text-xs text-muted-foreground">
                    ✓ يعمل: {workingCount} · ❌ لا يعمل: {proxies.length - workingCount} · 🔗 مُعيَّن: {assignedCount}
                  </p>
                </div>
                <Button onClick={testAll} disabled={testAllBusy || proxies.length === 0} variant="outline" className="gap-1.5">
                  {testAllBusy ? <Loader2 className="size-4 animate-spin" /> : <TestTube className="size-4" />}
                  اختبار الكل
                </Button>
              </div>

              {feedback && (
                <Alert className="mb-3">
                  <AlertDescription className="text-xs">{feedback}</AlertDescription>
                </Alert>
              )}
              {error && (
                <Alert variant="destructive" className="mb-3">
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              )}

              {loading ? (
                <div className="py-8 text-center"><Loader2 className="size-6 animate-spin mx-auto" /></div>
              ) : proxies.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  لا توجد بروكسيات — اذهب لتبويب "إضافة" أو "استيراد جماعي"
                </div>
              ) : (
                <div className="grid gap-2 max-h-96 overflow-y-auto">
                  {proxies.map((p) => (
                    <div key={p.id} className="border rounded-md p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant="outline" className="font-mono uppercase text-xs">{p.type}</Badge>
                          <span className="font-mono text-sm truncate" dir="ltr">{p.host}:{p.port}</span>
                          {p.country && p.country !== 'custom' && <Badge variant="secondary" className="text-xs">{p.country}</Badge>}
                          {p.country === 'custom' && <Badge variant="outline" className="text-xs text-purple-600">مخصص</Badge>}
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant={p.isWorking ? 'default' : 'destructive'} className="text-xs gap-1">
                            {p.isWorking ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
                            {p.isWorking ? 'يعمل' : 'معطّل'}
                          </Badge>
                          <Button size="sm" variant="ghost" onClick={() => test(p.id)} disabled={busy} className="h-7">
                            <Activity className="size-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => remove(p.id)} className="h-7 text-red-500">
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                        <div>التأخير: <span className="font-mono">{p.latency ? `${p.latency}ms` : '—'}</span></div>
                        <div>استخدام: <span className="font-mono">{p.usedCount}×</span></div>
                        <div>فشل: <span className="font-mono">{p.failCount}×</span></div>
                      </div>
                      {p.assignedAccounts.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap pt-1 border-t">
                          <Link2 className="size-3 text-muted-foreground" />
                          <span className="text-xs">مرتبط بـ {p.assignedAccounts.length} حساب:</span>
                          {p.assignedAccounts.slice(0, 3).map((a, i) => (
                            <Badge key={i} variant="secondary" className="text-xs font-mono">
                              {a.fullName || a.phone}
                            </Badge>
                          ))}
                          {p.assignedAccounts.length > 3 && (
                            <span className="text-xs text-muted-foreground">+{p.assignedAccounts.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ADD */}
        <TabsContent value="add">
          <Card>
            <CardHeader><CardTitle className="text-base">إضافة بروكسي واحد</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={add} className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <Label className="text-xs">النوع</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="socks5">SOCKS5</SelectItem>
                        <SelectItem value="http">HTTP</SelectItem>
                        <SelectItem value="https">HTTPS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">المضيف (Host)</Label>
                    <Input placeholder="127.0.0.1" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} required dir="ltr" />
                  </div>
                  <div>
                    <Label className="text-xs">المنفذ</Label>
                    <Input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: Number(e.target.value) })} required dir="ltr" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">اسم المستخدم</Label>
                    <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} dir="ltr" />
                  </div>
                  <div>
                    <Label className="text-xs">كلمة المرور</Label>
                    <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} dir="ltr" />
                  </div>
                  <div>
                    <Label className="text-xs">الدولة</Label>
                    <Input placeholder="SA" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} dir="ltr" />
                  </div>
                </div>
                {error && <Alert variant="destructive"><AlertDescription className="text-xs">{error}</AlertDescription></Alert>}
                <Button type="submit" disabled={busy || !form.host} className="gap-1.5">
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  إضافة البروكسي
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* IMPORT */}
        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="size-4" /> استيراد جماعي
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Alert className="bg-blue-500/10 border-blue-500/30">
                <FileText className="size-4" />
                <AlertDescription className="text-xs">
                  <strong>الصق قائمة البروكسيات (واحد لكل سطر).</strong> الصيغ المدعومة:
                  <br />• <code dir="ltr">socks5://user:pass@host:port</code>
                  <br />• <code dir="ltr">socks5://host:port</code>
                  <br />• <code dir="ltr">host:port:user:pass</code>
                  <br />• <code dir="ltr">host:port</code>
                </AlertDescription>
              </Alert>

              <div>
                <Label className="text-xs">النوع الافتراضي (للبروكسيات بدون نوع)</Label>
                <Select value={importType} onValueChange={setImportType}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">تلقائي (من الرابط)</SelectItem>
                    <SelectItem value="socks5">SOCKS5</SelectItem>
                    <SelectItem value="http">HTTP</SelectItem>
                    <SelectItem value="https">HTTPS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Textarea
                placeholder={'socks5://user1:pass1@1.2.3.4:1080\nsocks5://5.6.7.8:1080\n9.10.11.12:8080:user:pass\n13.14.15.16:1080'}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                dir="ltr"
                className="font-mono text-xs"
                rows={10}
              />

              {error && <Alert variant="destructive"><AlertDescription className="text-xs">{error}</AlertDescription></Alert>}
              {feedback && <Alert><AlertDescription className="text-xs">{feedback}</AlertDescription></Alert>}

              <div className="flex gap-2">
                <Button onClick={importProxies} disabled={busy || !importText.trim()} className="gap-1.5">
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  استيراد البروكسيات
                </Button>
                <Button variant="outline" onClick={() => setImportText('')}>مسح</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="bg-muted/30">
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">
            💡 <strong>نظام البروكسي الهجين:</strong> كل حساب تيليجرام يحصل تلقائياً على بروكسي من هذه القائمة (الأقل استخداماً).
            المستخدمون يستطيعون تعيين بروكسي مخصص من صفحة "حساباتي" لتجاوز التلقائي.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

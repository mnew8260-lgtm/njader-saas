'use client';

import { useState, useEffect } from 'react';
import {
  Loader2, Plus, Trash2, Wifi, WifiOff, Globe, Activity, Link2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: 'socks5', host: '', port: 1080, username: '', password: '', country: '',
  });
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

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
    setSaving(true);
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
      } else {
        setError(data.error || data.message);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا البروكسي؟')) return;
    await fetch(`/api/admin/proxy/${id}`, { method: 'DELETE' });
    load();
  };

  const test = async (id: string) => {
    setTestingId(id);
    try {
      const res = await fetch(`/api/admin/proxy/${id}/test`, { method: 'POST' });
      const data = await res.json();
      if (!data.ok) setError(`فشل: ${data.error || 'unknown'}`);
      load();
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex items-center justify-between gap-3 pt-6">
          <div>
            <p className="font-medium">البروكسيات ({proxies.length})</p>
            <p className="text-xs text-muted-foreground">
              {proxies.filter((p) => p.isWorking).length} يعمل ·{' '}
              {proxies.filter((p) => !p.isWorking).length} لا يعمل
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="gap-1.5">
            <Plus className="size-4" /> إضافة بروكسي
          </Button>
        </CardContent>
      </Card>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">إضافة بروكسي جديد</CardTitle>
          </CardHeader>
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
                  <Input
                    placeholder="127.0.0.1"
                    value={form.host}
                    onChange={(e) => setForm({ ...form, host: e.target.value })}
                    required
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label className="text-xs">المنفذ</Label>
                  <Input
                    type="number"
                    placeholder="1080"
                    value={form.port}
                    onChange={(e) => setForm({ ...form, port: Number(e.target.value) })}
                    required
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">اسم المستخدم (اختياري)</Label>
                  <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} dir="ltr" />
                </div>
                <div>
                  <Label className="text-xs">كلمة المرور (اختياري)</Label>
                  <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} dir="ltr" />
                </div>
                <div>
                  <Label className="text-xs">الدولة (اختياري)</Label>
                  <Input placeholder="RU" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} dir="ltr" />
                </div>
              </div>
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              <div className="flex gap-2">
                <Button type="submit" disabled={saving} className="gap-1.5">
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  حفظ البروكسي
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="py-12 text-center"><Loader2 className="size-6 animate-spin mx-auto" /></div>
      ) : proxies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Globe className="size-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium">لا توجد بروكسيات مضافة</p>
            <p className="text-sm text-muted-foreground mt-1">اضغط "إضافة بروكسي" لإضافة بروكسي جديد</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {proxies.map((p) => (
            <Card key={p.id}>
              <CardContent className="py-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className="font-mono uppercase">{p.type}</Badge>
                    <span className="font-mono text-sm truncate" dir="ltr">{p.host}:{p.port}</span>
                    {p.country && <Badge variant="secondary" className="text-xs">{p.country}</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={p.isWorking ? 'default' : 'destructive'} className="gap-1">
                      {p.isWorking ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
                      {p.isWorking ? 'يعمل' : 'لا يعمل'}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => test(p.id)} disabled={testingId === p.id} className="h-8">
                      {testingId === p.id ? <Loader2 className="size-3 animate-spin" /> : <Activity className="size-3" />}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => remove(p.id)} className="h-8 text-red-500">
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
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Link2 className="size-3 text-muted-foreground" />
                    <span className="text-xs">مرتبط بـ:</span>
                    {p.assignedAccounts.map((a) => (
                      <Badge key={a.phone} variant="secondary" className="text-xs font-mono">
                        {a.fullName || a.phone}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

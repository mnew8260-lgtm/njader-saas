'use client';

import { useState, useEffect } from 'react';
import {
  Loader2, Globe, User, Plus, X, Save, Server, Check, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface AccountProxyManagerProps {
  accountId: string;
  phone: string;
}

export function AccountProxyManager({ accountId, phone }: AccountProxyManagerProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [customProxy, setCustomProxy] = useState<any>(null);
  const [autoProxy, setAutoProxy] = useState<any>(null);

  // Form state
  const [type, setType] = useState('socks5');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(1080);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const loadProxy = async () => {
    try {
      const res = await fetch(`/api/accounts/${accountId}/proxy`);
      const data = await res.json();
      if (data.ok) {
        setCustomProxy(data.customProxy);
        setAutoProxy(data.autoProxy);
      }
    } catch {}
  };

  useEffect(() => { loadProxy(); }, [accountId]);

  const saveCustomProxy = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/accounts/${accountId}/proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proxy: { type, host, port: Number(port), username: username || undefined, password: password || undefined },
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedback('✅ تم تعيين البروكسي المخصص بنجاح');
        setOpen(false);
        loadProxy();
      } else {
        setFeedback(data.error || data.message || 'فشل');
      }
    } catch (e: any) {
      setFeedback(e.message);
    } finally {
      setBusy(false);
    }
  };

  const removeCustomProxy = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/accounts/${accountId}/proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proxy: null }),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedback('✅ تمت إزالة البروكسي المخصص — سيستخدم النظام البروكسي التلقائي');
        setOpen(false);
        loadProxy();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="h-7 text-xs gap-1">
          {customProxy ? <User className="size-3" /> : <Globe className="size-3" />}
          {customProxy ? 'تعديل البروكسي' : 'بروكسي مخصص'}
        </Button>
        {customProxy && (
          <Button size="sm" variant="ghost" onClick={removeCustomProxy} className="h-7 text-xs text-red-500">
            <X className="size-3" />
          </Button>
        )}
      </div>

      {feedback && (
        <Alert className="mt-2">
          <AlertDescription className="text-xs">{feedback}</AlertDescription>
        </Alert>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Server className="size-4" /> بروكسي مخصص للحساب {phone}
            </DialogTitle>
            <DialogDescription>
              تعيين بروكسي خاص لهذا الحساب. سيُستخدم في كل العمليات بدلاً من البروكسي التلقائي.
            </DialogDescription>
          </DialogHeader>

          {autoProxy && !customProxy && (
            <Alert className="bg-blue-500/10 border-blue-500/30">
              <Globe className="size-4" />
              <AlertDescription className="text-xs">
                <strong>البروكسي التلقائي الحالي:</strong> {autoProxy.type}://{autoProxy.host}:{autoProxy.port}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <div>
              <Label className="text-xs">نوع البروكسي</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="socks5">SOCKS5 (موصى به)</SelectItem>
                  <SelectItem value="http">HTTP</SelectItem>
                  <SelectItem value="https">HTTPS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label className="text-xs">المضيف (Host)</Label>
                <Input
                  placeholder="127.0.0.1"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  dir="ltr"
                />
              </div>
              <div>
                <Label className="text-xs">المنفذ</Label>
                <Input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                  dir="ltr"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">اسم المستخدم (اختياري)</Label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} dir="ltr" />
              </div>
              <div>
                <Label className="text-xs">كلمة المرور (اختياري)</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              💡 <strong>ملاحظة:</strong> البروكسي المخصص يلغي البروكسي التلقائي لهذا الحساب فقط.
              ستحتاج للاختبار للتأكد من عمله مع تيليجرام.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={saveCustomProxy} disabled={busy || !host} className="gap-1.5">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              حفظ البروكسي
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

'use client';

import { useState } from 'react';
import {
  Loader2, ArrowLeft, ArrowRight, Download, Upload, Users, Send,
  Trash2, Ban, MicOff, Mic, ShieldCheck, X, FileDown, Search,
  CheckCircle2, XCircle, AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

type ToolType = 'scrape' | 'transfer' | 'add' | 'dm' | 'kick' | 'ban' | 'mute';

interface JobResult {
  total: number;
  success: number;
  failed: number;
  details: { user: string; status: 'success' | 'failed'; reason?: string }[];
}

export function MassToolsClient({ accounts }: { accounts: Account[] }) {
  const [selectedAccount, setSelectedAccount] = useState(accounts[0]?.id || '');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<JobResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<string>('');

  // Tool-specific state
  const [scrapePeer, setScrapePeer] = useState('');
  const [scrapeLimit, setScrapeLimit] = useState(500);
  const [scrapeFilterBots, setScrapeFilterBots] = useState(true);
  const [scrapeFilterDeleted, setScrapeFilterDeleted] = useState(true);

  const [transferSource, setTransferSource] = useState('');
  const [transferTarget, setTransferTarget] = useState('');
  const [transferLimit, setTransferLimit] = useState(30);
  const [transferDelay, setTransferDelay] = useState(10);

  const [addTarget, setAddTarget] = useState('');
  const [addUserList, setAddUserList] = useState('');
  const [addDelay, setAddDelay] = useState(5);

  const [dmUserList, setDmUserList] = useState('');
  const [dmMessage, setDmMessage] = useState('');
  const [dmDelay, setDmDelay] = useState(5);
  const [dmSourcePeer, setDmSourcePeer] = useState('');

  const [kickTarget, setKickTarget] = useState('');
  const [kickUserList, setKickUserList] = useState('');

  const runCommand = async (commandId: string, params: Record<string, any>) => {
    setBusy(true);
    setError(null);
    setResult(null);
    setOutput('');

    try {
      const res = await fetch('/api/commands/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: selectedAccount,
          commandId,
          params,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setOutput(data.output || '(لا يوجد مخرجات)');
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

  return (
    <div className="space-y-4">
      {/* Account selector */}
      <Card>
        <CardContent className="pt-6">
          <Label className="text-sm mb-2 block">اختر الحساب المستخدم للتنفيذ</Label>
          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger><SelectValue placeholder="اختر حساباً..." /></SelectTrigger>
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

      <Tabs defaultValue="scrape" className="w-full">
        <TabsList className="grid grid-cols-4 lg:grid-cols-7 w-full">
          <TabsTrigger value="scrape" className="text-xs">📥 سحب</TabsTrigger>
          <TabsTrigger value="transfer" className="text-xs">🔄 نقل</TabsTrigger>
          <TabsTrigger value="add" className="text-xs">➕ إضافة</TabsTrigger>
          <TabsTrigger value="dm" className="text-xs">✉️ DM</TabsTrigger>
          <TabsTrigger value="kick" className="text-xs">👢 طرد</TabsTrigger>
          <TabsTrigger value="ban" className="text-xs">⛔ حظر</TabsTrigger>
          <TabsTrigger value="mute" className="text-xs">🔇 كتم</TabsTrigger>
        </TabsList>

        {/* SCRAPE */}
        <TabsContent value="scrape">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Download className="size-4" /> سحب أعضاء من مجموعة
              </CardTitle>
              <CardDescription>استخرج قائمة كاملة بأعضاء مجموعة (مع التصفية)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <Label>المجموعة المصدر</Label>
                  <Input
                    placeholder="@groupname أو -1001234567890"
                    value={scrapePeer}
                    onChange={(e) => setScrapePeer(e.target.value)}
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label>الحد الأقصى</Label>
                  <Input
                    type="number"
                    value={scrapeLimit}
                    onChange={(e) => setScrapeLimit(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={scrapeFilterBots}
                    onChange={(e) => setScrapeFilterBots(e.target.checked)}
                    className="size-4"
                  />
                  استبعاد البوتات
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={scrapeFilterDeleted}
                    onChange={(e) => setScrapeFilterDeleted(e.target.checked)}
                    className="size-4"
                  />
                  استبعاد الحسابات المحذوفة
                </label>
              </div>
              <Button
                onClick={() => runCommand('scrape_group_members', {
                  groupPeer: scrapePeer,
                  limit: scrapeLimit,
                  filterBots: scrapeFilterBots,
                  filterDeleted: scrapeFilterDeleted,
                })}
                disabled={busy || !scrapePeer}
                className="gap-1.5"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                سحب الأعضاء
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TRANSFER */}
        <TabsContent value="transfer">
          <Card className="border-rose-500/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowRight className="size-4" /> نقل أعضاء من قروب مصدر إلى قروب هدف
              </CardTitle>
              <CardDescription>العملية الكاملة: سحب + إضافة، مع تأخير تلقائي</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription className="text-xs">
                  <strong>خطر:</strong> قد يحظر تيليجرام الحساب. لا تنقل أكثر من 30-50 يومياً.
                </AlertDescription>
              </Alert>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>المجموعة المصدر (السحب منها)</Label>
                  <Input
                    placeholder="@sourcegroup"
                    value={transferSource}
                    onChange={(e) => setTransferSource(e.target.value)}
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label>المجموعة الهدف (الإضافة إليها)</Label>
                  <Input
                    placeholder="@targetgroup"
                    value={transferTarget}
                    onChange={(e) => setTransferTarget(e.target.value)}
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>عدد الأعضاء للنقل</Label>
                  <Input
                    type="number"
                    value={transferLimit}
                    onChange={(e) => setTransferLimit(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>التأخير (ثانية)</Label>
                  <Input
                    type="number"
                    value={transferDelay}
                    onChange={(e) => setTransferDelay(Number(e.target.value))}
                  />
                </div>
              </div>
              <Button
                onClick={() => runCommand('transfer_members', {
                  sourcePeer: transferSource,
                  targetPeer: transferTarget,
                  limit: transferLimit,
                  delay: transferDelay,
                  filterBots: true,
                  filterDeleted: true,
                  stopOnFlood: true,
                })}
                disabled={busy || !transferSource || !transferTarget}
                className="gap-1.5 bg-rose-600 hover:bg-rose-700"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
                ابدأ النقل
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ADD */}
        <TabsContent value="add">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="size-4" /> إضافة أعضاء لقروب (قائمة جاهزة)
              </CardTitle>
              <CardDescription>الصق قائمة usernames أو IDs وأضفهم لمجموعة هدف</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>المجموعة الهدف</Label>
                <Input
                  placeholder="@targetgroup"
                  value={addTarget}
                  onChange={(e) => setAddTarget(e.target.value)}
                  dir="ltr"
                />
              </div>
              <div>
                <Label>قائمة المستخدمين (واحد لكل سطر)</Label>
                <Textarea
                  placeholder={'@user1\n@user2\n123456789\n@user3'}
                  value={addUserList}
                  onChange={(e) => setAddUserList(e.target.value)}
                  dir="ltr"
                  className="font-mono text-xs"
                  rows={6}
                />
              </div>
              <div>
                <Label>التأخير بين الإضافات (ثانية)</Label>
                <Input
                  type="number"
                  value={addDelay}
                  onChange={(e) => setAddDelay(Number(e.target.value))}
                />
              </div>
              <Button
                onClick={() => runCommand('mass_add_members', {
                  targetPeer: addTarget,
                  userList: addUserList,
                  delay: addDelay,
                  stopOnFlood: true,
                })}
                disabled={busy || !addTarget || !addUserList}
                className="gap-1.5"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                إضافة الآن
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DM */}
        <TabsContent value="dm">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="size-4" /> إرسال DM جماعي
              </CardTitle>
              <CardDescription>إرسال رسالة خاصة لقائمة مستخدمين أو لأعضاء قروب</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>أو من مجموعة (اختياري)</Label>
                  <Input
                    placeholder="@groupname لسحب الأعضاء"
                    value={dmSourcePeer}
                    onChange={(e) => setDmSourcePeer(e.target.value)}
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label>أو قائمة يدوية</Label>
                  <Input
                    placeholder="@user1, @user2, ..."
                    value={dmUserList}
                    onChange={(e) => setDmUserList(e.target.value)}
                    dir="ltr"
                  />
                </div>
              </div>
              <div>
                <Label>نص الرسالة</Label>
                <Textarea
                  placeholder="اكتب رسالتك هنا..."
                  value={dmMessage}
                  onChange={(e) => setDmMessage(e.target.value)}
                  rows={4}
                />
              </div>
              <div>
                <Label>التأخير (ثانية)</Label>
                <Input
                  type="number"
                  value={dmDelay}
                  onChange={(e) => setDmDelay(Number(e.target.value))}
                />
              </div>
              <Button
                onClick={() => {
                  if (dmSourcePeer) {
                    runCommand('mass_dm_group_members', {
                      groupPeer: dmSourcePeer,
                      message: dmMessage,
                      limit: 30,
                      delay: dmDelay,
                    });
                  } else {
                    runCommand('mass_dm', {
                      userList: dmUserList,
                      message: dmMessage,
                      delay: dmDelay,
                      stopOnFlood: true,
                    });
                  }
                }}
                disabled={busy || !dmMessage || (!dmSourcePeer && !dmUserList)}
                className="gap-1.5"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                إرسال
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* KICK */}
        <TabsContent value="kick">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <X className="size-4" /> طرد جماعي
              </CardTitle>
              <CardDescription>طرد قائمة مستخدمين من مجموعة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>المجموعة</Label>
                <Input
                  placeholder="@groupname"
                  value={kickTarget}
                  onChange={(e) => setKickTarget(e.target.value)}
                  dir="ltr"
                />
              </div>
              <div>
                <Label>قائمة المستخدمين</Label>
                <Textarea
                  placeholder={'123456789\n@user1\n@user2'}
                  value={kickUserList}
                  onChange={(e) => setKickUserList(e.target.value)}
                  dir="ltr"
                  className="font-mono text-xs"
                  rows={5}
                />
              </div>
              <Button
                onClick={() => runCommand('mass_kick', {
                  groupPeer: kickTarget,
                  userList: kickUserList,
                  delay: 2,
                })}
                disabled={busy || !kickTarget || !kickUserList}
                variant="destructive"
                className="gap-1.5"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
                طرد الآن
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BAN */}
        <TabsContent value="ban">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Ban className="size-4" /> حظر جماعي
              </CardTitle>
              <CardDescription>حظر قائمة مستخدمين من مجموعة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => runCommand('mass_ban', {
                  groupPeer: kickTarget,
                  userList: kickUserList,
                })}
                disabled={busy || !kickTarget || !kickUserList}
                variant="destructive"
                className="gap-1.5"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Ban className="size-4" />}
                حظر
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MUTE */}
        <TabsContent value="mute">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MicOff className="size-4" /> كتم جماعي
              </CardTitle>
              <CardDescription>كتم قائمة مستخدمين في مجموعة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => runCommand('mass_mute', {
                  groupPeer: kickTarget,
                  userList: kickUserList,
                  duration: 60,
                })}
                disabled={busy || !kickTarget || !kickUserList}
                className="gap-1.5"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <MicOff className="size-4" />}
                كتم (60 دقيقة)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Output */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
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

'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Loader2, Play, Search, History, Terminal, ChevronLeft, ChevronRight, X, Users,
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { MultiAccountSelector } from '@/components/accounts/MultiAccountSelector';

interface Account {
  id: string;
  phone: string;
  fullName: string | null;
  username: string | null;
  status: string;
}

interface HistoryRow {
  id: string;
  commandId: string;
  commandName: string;
  input: string;
  output: string;
  status: string;
  duration: number | null;
  executedAt: string;
}

interface CommandDef {
  id: string;
  name: string;
  label: string;
  description: string;
  category: string;
  icon: string;
  params: any[];
  requiresAccount: boolean;
  danger?: 'low' | 'medium' | 'high';
}

interface Category {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export function CommandRunner({
  accounts,
  history: initialHistory,
}: {
  accounts: Account[];
  history: HistoryRow[];
}) {
  const [commands, setCommands] = useState<CommandDef[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('account');
  const [search, setSearch] = useState('');
  const [selectedCommand, setSelectedCommand] = useState<CommandDef | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(accounts[0]?.id ? [accounts[0].id] : []);
  const [multiMode, setMultiMode] = useState(false);
  const [params, setParams] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState<string>('');
  const [history, setHistory] = useState<HistoryRow[]>(initialHistory);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState<HistoryRow | null>(null);

  // Load commands from local file (compiled into client)
  useEffect(() => {
    // We can't import from @/lib/commands directly because it's server-only metadata
    // but actually since it's a pure TS file with no server imports, we can.
    fetch('/api/commands/list')
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setCommands(data.commands);
          setCategories(data.categories);
        }
      })
      .catch(() => {});
  }, []);

  const filteredCommands = useMemo(() => {
    return commands.filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        return c.label.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
      }
      return c.category === selectedCategory;
    });
  }, [commands, selectedCategory, search]);

  const currentCategory = categories.find((c) => c.id === selectedCategory);

  const openCommand = (cmd: CommandDef) => {
    setSelectedCommand(cmd);
    setParams({});
    setOutput('');
    setError(null);
  };

  const runCommand = async () => {
    if (!selectedCommand) return;
    const useMulti = multiMode && selectedAccountIds.length > 1;
    if (!useMulti && !selectedAccountId) return;
    if (useMulti && selectedAccountIds.length === 0) return;
    setBusy(true);
    setOutput('');
    setError(null);
    try {
      if (useMulti) {
        // Multi-account: distribute work across selected accounts
        const res = await fetch('/api/commands/execute-multi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountIds: selectedAccountIds,
            commandId: selectedCommand.id,
            params,
            mode: 'parallel',
          }),
        });
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); }
        catch { data = { ok: false, error: 'استجابة غير صالحة' }; }
        if (data.ok !== false && data.mergedOutput) {
          setOutput(data.mergedOutput);
        } else {
          setError(data.error || data.mergedOutput || 'فشل التنفيذ');
          if (data.mergedOutput) setOutput(data.mergedOutput);
        }
      } else {
        // Single account
        const res = await fetch('/api/commands/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId: multiMode ? selectedAccountIds[0] : selectedAccountId,
            commandId: selectedCommand.id,
            params,
          }),
        });
        const data = await res.json();
        if (data.ok) {
          setOutput(data.output || '(no output)');
        } else {
          setError(data.error || data.message || 'فشل تنفيذ الأمر');
          if (data.output) setOutput(data.output);
        }
      }
      // Refresh history
      const h = await fetch('/api/commands/history?limit=20').then((r) => r.json());
      if (h.ok) setHistory(h.history);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (accounts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Terminal className="size-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-lg font-medium">لا توجد حسابات تيليجرام</p>
          <p className="text-sm text-muted-foreground mt-1">
            أضف حساباً أولاً من <a href="/telegram-login" className="text-primary underline">صفحة تسجيل الدخول</a>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Multi-Account toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMultiMode(!multiMode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
            multiMode
              ? 'bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-500/30'
              : 'bg-muted text-muted-foreground'
          }`
          }
        >
          <Users className="size-3.5" />
          {multiMode ? '✓ Multi-Account مُفعّل' : 'تفعيل Multi-Account'}
        </button>
        {multiMode && selectedAccountIds.length > 1 && (
          <Badge className="bg-purple-500/20 text-purple-700 dark:text-purple-400 gap-1">
            ⚡ توزيع على {selectedAccountIds.length} حسابات
          </Badge>
        )}
      </div>

      {/* Account selector */}
      {multiMode ? (
        <MultiAccountSelector
          accounts={accounts}
          selectedIds={selectedAccountIds}
          onChange={setSelectedAccountIds}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">اختر الحساب</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger>
              <SelectValue placeholder="اختر حساباً..." />
            </SelectTrigger>
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
      )}

      {/* Commands grid */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="ابحث عن أمر..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-9"
              />
            </div>
          </div>

          {!search && categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors ${
                    selectedCategory === c.id
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                      : 'bg-muted hover:bg-muted/70'
                  }`}
                >
                  <span>{c.icon}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          )}

          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              لا توجد أوامر مطابقة
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {filteredCommands.map((cmd) => (
                <button
                  key={cmd.id}
                  onClick={() => openCommand(cmd)}
                  className="text-right p-3 rounded-md border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xl">{cmd.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm flex items-center gap-1.5">
                        {cmd.label}
                        {cmd.danger === 'high' && <Badge variant="destructive" className="text-[10px] px-1 py-0">خطر</Badge>}
                        {cmd.danger === 'medium' && <Badge variant="secondary" className="text-[10px] px-1 py-0">حذر</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {cmd.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="size-4" /> آخر العمليات
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              لا يوجد سجل عمليات بعد
            </div>
          ) : (
            <div className="space-y-1">
              {history.map((h) => (
                <button
                  key={h.id}
                  onClick={() => setShowHistory(h)}
                  className="w-full text-right p-2 rounded-md border hover:bg-muted/50 transition-colors flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium">{h.commandName}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {new Date(h.executedAt).toLocaleString('ar')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {h.duration && <span className="text-[10px] text-muted-foreground">{h.duration}ms</span>}
                    <Badge variant={h.status === 'success' ? 'default' : 'destructive'} className="text-[10px]">
                      {h.status}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Command execution dialog */}
      <Dialog open={!!selectedCommand} onOpenChange={(o) => !o && setSelectedCommand(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">{selectedCommand?.icon}</span>
              {selectedCommand?.label}
            </DialogTitle>
            <DialogDescription>{selectedCommand?.description}</DialogDescription>
          </DialogHeader>

          {selectedCommand?.params.length ? (
            <div className="space-y-3 max-h-[40vh] overflow-y-auto p-1">
              {selectedCommand.params.map((p: any) => (
                <div key={p.name} className="space-y-1.5">
                  <Label className="text-xs">
                    {p.label} {p.required && <span className="text-red-500">*</span>}
                  </Label>
                  {p.type === 'textarea' ? (
                    <Textarea
                      placeholder={p.placeholder}
                      value={params[p.name] || ''}
                      onChange={(e) => setParams({ ...params, [p.name]: e.target.value })}
                    />
                  ) : p.type === 'select' ? (
                    <Select
                      value={params[p.name] || ''}
                      onValueChange={(v) => setParams({ ...params, [p.name]: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={p.placeholder || 'اختر...'} />
                      </SelectTrigger>
                      <SelectContent>
                        {p.options?.map((o: any) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : p.type === 'checkbox' ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={params[p.name] ?? p.defaultValue ?? false}
                        onChange={(e) => setParams({ ...params, [p.name]: e.target.checked })}
                        className="size-4"
                        id={`param-${p.name}`}
                      />
                      <Label htmlFor={`param-${p.name}`} className="text-sm font-normal">
                        تفعيل
                      </Label>
                    </div>
                  ) : (
                    <Input
                      type={p.type === 'number' ? 'number' : 'text'}
                      placeholder={p.placeholder}
                      value={params[p.name] ?? ''}
                      onChange={(e) => setParams({ ...params, [p.name]: p.type === 'number' ? Number(e.target.value) : e.target.value })}
                      dir={p.type === 'phone' || p.name === 'username' ? 'ltr' : undefined}
                    />
                  )}
                  {p.help && <p className="text-[11px] text-muted-foreground">{p.help}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">هذا الأمر لا يحتاج إلى معاملات إدخال.</p>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {output && (
            <div className="space-y-2">
              <Label className="text-xs">المخرجات</Label>
              <pre className="bg-zinc-950 text-zinc-100 p-3 rounded-md text-xs overflow-x-auto max-h-48 overflow-y-auto font-mono" dir="ltr">
                {output}
              </pre>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setSelectedCommand(null)}>إغلاق</Button>
            <Button onClick={runCommand} disabled={busy || !selectedAccountId}>
              {busy ? <Loader2 className="size-4 animate-spin ml-2" /> : <Play className="size-4 ml-2" />}
              تنفيذ الأمر
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* History viewer */}
      <Dialog open={!!showHistory} onOpenChange={(o) => !o && setShowHistory(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">{showHistory?.commandName}</DialogTitle>
            <DialogDescription>
              {showHistory && new Date(showHistory.executedAt).toLocaleString('ar')}
            </DialogDescription>
          </DialogHeader>
          {showHistory?.input && (
            <div className="space-y-1.5">
              <Label className="text-xs">الإدخال</Label>
              <pre className="bg-muted p-2 rounded-md text-xs overflow-x-auto font-mono" dir="ltr">
                {showHistory.input}
              </pre>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">المخرجات</Label>
            <pre className="bg-zinc-950 text-zinc-100 p-3 rounded-md text-xs overflow-x-auto max-h-72 overflow-y-auto font-mono" dir="ltr">
              {showHistory?.output || '(no output)'}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

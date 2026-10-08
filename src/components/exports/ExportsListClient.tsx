'use client';

import { useState } from 'react';
import {
  FileText, Download, Trash2, RefreshCw, Loader2, Filter, Search, Calendar,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ExportRow {
  id: string;
  commandId: string;
  commandName: string;
  format: string;
  sourcePeer: string | null;
  totalCount: number;
  createdAt: string;
}

function formatDate(s: string): string {
  return new Date(s).toLocaleString('ar', { dateStyle: 'medium', timeStyle: 'short' });
}

const FORMAT_COLORS: Record<string, string> = {
  txt: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300',
  csv: 'bg-green-500/10 text-green-700 dark:text-green-400',
  json: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
};

export function ExportsListClient({ exports: initialExports }: { exports: ExportRow[] }) {
  const [exports, setExports] = useState<ExportRow[]>(initialExports);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setBusyId('refresh');
    try {
      const res = await fetch('/api/exports/list', { cache: 'no-store' });
      const data = await res.json();
      if (data.ok) setExports(data.exports);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const download = (id: string, format: string) => {
    // Trigger file download via iframe (to avoid navigation)
    const url = `/api/exports/${id}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `njadder_export.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const remove = async (id: string) => {
    if (!confirm('حذف هذا الملف؟')) return;
    setBusyId(id);
    try {
      await fetch(`/api/exports/${id}`, { method: 'DELETE' });
      setExports(exports.filter((e) => e.id !== id));
    } finally {
      setBusyId(null);
    }
  };

  const filtered = exports.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.commandName.toLowerCase().includes(q) ||
      e.commandId.toLowerCase().includes(q) ||
      (e.sourcePeer || '').toLowerCase().includes(q)
    );
  });

  const totalUsers = exports.reduce((sum, e) => sum + e.totalCount, 0);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-5 text-center">
          <div className="text-2xl font-bold">{exports.length}</div>
          <div className="text-xs text-muted-foreground mt-1">ملف مُصدَّر</div>
        </CardContent></Card>
        <Card><CardContent className="pt-5 text-center">
          <div className="text-2xl font-bold">{totalUsers.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1">إجمالي المستخدمين المسحوبين</div>
        </CardContent></Card>
        <Card><CardContent className="pt-5 text-center">
          <div className="text-2xl font-bold">{exports.filter((e) => e.format === 'csv').length}</div>
          <div className="text-xs text-muted-foreground mt-1">ملفات CSV (Excel)</div>
        </CardContent></Card>
      </div>

      {/* Search + refresh */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="ابحث باسم الأمر أو القروب..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>
        <Button variant="outline" onClick={refresh} disabled={busyId === 'refresh'}>
          {busyId === 'refresh' ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          تحديث
        </Button>
      </div>

      {error && (
        <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="size-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium">لا توجد ملفات مُصدَّرة بعد</p>
            <p className="text-sm text-muted-foreground mt-1">
              نفّذ أي أمر سحب أو فلترة من <a href="/commands" className="text-primary underline">مدير الأوامر</a>،
              وسيظهر الملف هنا تلقائياً.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2 max-h-[60vh] overflow-y-auto">
          {filtered.map((exp) => (
            <Card key={exp.id}>
              <CardContent className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="size-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 grid place-items-center shrink-0">
                      <FileText className="size-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{exp.commandName}</p>
                      <p className="text-xs text-muted-foreground font-mono" dir="ltr">
                        {exp.sourcePeer || `cmd: ${exp.commandId}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge variant="outline" className={`text-xs ${FORMAT_COLORS[exp.format] || ''}`}>
                          .{exp.format.toUpperCase()}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {exp.totalCount} مستخدم
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="size-3" />
                          {formatDate(exp.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => download(exp.id, exp.format)}
                      className="h-8 gap-1.5"
                    >
                      <Download className="size-3.5" />
                      تنزيل
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => remove(exp.id)}
                      disabled={busyId === exp.id}
                      className="h-8 text-red-500"
                    >
                      {busyId === exp.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-blue-500/5 border-blue-500/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Filter className="size-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">💡 كل أمر سحب أو فلترة ينشئ ملفاً تلقائياً</p>
              <p className="text-xs text-muted-foreground mt-1">
                الملفات بصيغة TXT (افتراضياً) أو CSV (للـ Excel). عند تنزيل CSV، يمكنك فتحه مباشرة في Excel.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

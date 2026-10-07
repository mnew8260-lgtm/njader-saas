'use client';

import { useState, useEffect } from 'react';
import {
  Loader2, CheckCircle2, XCircle, Clock, AlertTriangle,
  Calendar, MoreVertical, RotateCw, Ban, Plus, Search, Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { SUBSCRIPTION_PLANS, type SubscriptionPlan } from '@/lib/subscription';

interface UserRow {
  id: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
  role: string;
  accountStatus: string;
  subscriptionPlan: string | null;
  subscriptionEndsAt: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  requestedAt: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  isBanned: boolean;
  _count: { telegramAccounts: number; commandExecutions: number };
}

const STATUS_META: Record<string, { label: string; color: string; icon: JSX.Element }> = {
  pending:  { label: 'بانتظار', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',   icon: <Clock className="size-3" /> },
  approved: { label: 'مفعّل',  color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30', icon: <CheckCircle2 className="size-3" /> },
  rejected: { label: 'مرفوض', color: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30',         icon: <XCircle className="size-3" /> },
  expired:  { label: 'منتهي', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30', icon: <AlertTriangle className="size-3" /> },
};

function formatDate(s: string | null): string {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('ar', { year: 'numeric', month: 'short', day: 'numeric' });
}

function daysLeft(end: string | null): number | null {
  if (!end) return null;
  const ms = new Date(end).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function UsersManager() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [actionTarget, setActionTarget] = useState<UserRow | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'extend' | 'reject' | 'revoke' | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('month');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/admin/users/list?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.ok) setUsers(data.users);
      else setError(data.error);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (u.email || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.displayName || '').toLowerCase().includes(q)
    );
  });

  const openAction = (u: UserRow, action: 'approve' | 'extend' | 'reject' | 'revoke') => {
    setActionTarget(u);
    setActionType(action);
    setSelectedPlan('month');
    setReason('');
    setFeedback(null);
  };

  const closeAction = () => {
    setActionTarget(null);
    setActionType(null);
  };

  const submitAction = async () => {
    if (!actionTarget || !actionType) return;
    setBusy(true);
    setFeedback(null);
    try {
      const endpoint = `/api/admin/users/${actionTarget.id}/${actionType}`;
      const body: any = {};
      if (actionType === 'approve' || actionType === 'extend') body.plan = selectedPlan;
      if (actionType === 'reject' || actionType === 'revoke') body.reason = reason || undefined;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedback(data.message || 'تم بنجاح');
        closeAction();
        load();
      } else {
        setFeedback(data.error || data.message || 'فشل');
      }
    } catch (e: any) {
      setFeedback(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="ابحث بالبريد أو اسم المستخدم..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="size-4 ml-1" />
              <SelectValue placeholder="كل الحالات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="pending">بانتظار الموافقة</SelectItem>
              <SelectItem value="approved">مفعّل</SelectItem>
              <SelectItem value="rejected">مرفوض</SelectItem>
              <SelectItem value="expired">منتهي</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={load} disabled={loading}>
            <RotateCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="size-6 animate-spin mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            لا يوجد مستخدمون مطابقون
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right border-b text-muted-foreground">
                  <th className="pb-2 pr-2">المستخدم</th>
                  <th className="pb-2">الحالة</th>
                  <th className="pb-2">الخطة</th>
                  <th className="pb-2">ينتهي</th>
                  <th className="pb-2">حسابات TG</th>
                  <th className="pb-2">أوامر</th>
                  <th className="pb-2">آخر دخول</th>
                  <th className="pb-2">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const meta = STATUS_META[u.accountStatus] || STATUS_META.pending;
                  const left = daysLeft(u.subscriptionEndsAt);
                  return (
                    <tr key={u.id} className="border-b hover:bg-muted/30">
                      <td className="py-3 pr-2">
                        <div className="font-medium">{u.displayName || u.username || 'بدون اسم'}</div>
                        <div className="text-xs text-muted-foreground font-mono" dir="ltr">{u.email}</div>
                      </td>
                      <td>
                        <Badge variant="outline" className={`${meta.color} gap-1`}>
                          {meta.icon}{meta.label}
                        </Badge>
                      </td>
                      <td className="text-xs">
                        {u.subscriptionPlan
                          ? SUBSCRIPTION_PLANS.find((p) => p.id === u.subscriptionPlan)?.label || u.subscriptionPlan
                          : '—'}
                      </td>
                      <td className="text-xs">
                        {u.subscriptionEndsAt ? (
                          <div>
                            <div>{formatDate(u.subscriptionEndsAt)}</div>
                            {left !== null && (
                              <div className={`text-[10px] ${left < 7 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                {left > 0 ? `${left} يوم متبقٍ` : 'انتهى'}
                              </div>
                            )}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="text-center">{u._count.telegramAccounts}</td>
                      <td className="text-center">{u._count.commandExecutions}</td>
                      <td className="text-xs">{formatDate(u.lastLoginAt)}</td>
                      <td>
                        <div className="flex gap-1">
                          {u.accountStatus === 'pending' && (
                            <Button size="sm" onClick={() => openAction(u, 'approve')} className="h-7 gap-1 text-xs">
                              <CheckCircle2 className="size-3" /> موافقة
                            </Button>
                          )}
                          {u.accountStatus === 'approved' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => openAction(u, 'extend')} className="h-7 text-xs">
                                <Plus className="size-3" /> تمديد
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => openAction(u, 'revoke')} className="h-7 text-xs text-amber-600">
                                <Ban className="size-3" /> إلغاء
                              </Button>
                            </>
                          )}
                          {u.accountStatus === 'pending' && (
                            <Button size="sm" variant="outline" onClick={() => openAction(u, 'reject')} className="h-7 text-xs text-red-500">
                              <XCircle className="size-3" /> رفض
                            </Button>
                          )}
                          {(u.accountStatus === 'rejected' || u.accountStatus === 'expired') && (
                            <Button size="sm" variant="outline" onClick={() => openAction(u, 'approve')} className="h-7 text-xs">
                              <RotateCw className="size-3" /> إعادة
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Action dialog */}
        <Dialog open={!!actionTarget} onOpenChange={(o) => !o && closeAction()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === 'approve' && '✅ الموافقة على المستخدم'}
                {actionType === 'extend' && '➕ تمديد الاشتراك'}
                {actionType === 'reject' && '❌ رفض المستخدم'}
                {actionType === 'revoke' && '⚠️ إلغاء الاشتراك'}
              </DialogTitle>
              <DialogDescription>
                {actionTarget?.email} · {actionTarget?.username}
              </DialogDescription>
            </DialogHeader>

            {(actionType === 'approve' || actionType === 'extend') && (
              <div className="space-y-3">
                <Label>اختر مدة الاشتراك</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SUBSCRIPTION_PLANS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPlan(p.id)}
                      className={`p-3 rounded-md border text-right transition-colors ${
                        selectedPlan === p.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="font-semibold text-sm flex items-center justify-between">
                        {p.label}
                        {p.popular && <Badge variant="secondary" className="text-[10px]">شائع</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {p.days ? `${p.days} يوم` : 'مدى الحياة'}
                      </div>
                      <div className="text-xs font-mono mt-1">${p.price}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(actionType === 'reject' || actionType === 'revoke') && (
              <div className="space-y-2">
                <Label>السبب (اختياري)</Label>
                <Input
                  placeholder="سبب الرفض أو الإلغاء..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            )}

            {feedback && (
              <Alert variant="destructive">
                <AlertDescription>{feedback}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={closeAction} disabled={busy}>إلغاء</Button>
              <Button
                onClick={submitAction}
                disabled={busy}
                variant={actionType === 'reject' || actionType === 'revoke' ? 'destructive' : 'default'}
              >
                {busy && <Loader2 className="size-4 animate-spin ml-2" />}
                تأكيد
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

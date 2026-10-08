import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { Phone, Plus, Globe, User, Server } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AccountProxyManager } from '@/components/accounts/AccountProxyManager';

export const dynamic = 'force-dynamic';

async function deleteAccount(formData: FormData) {
  'use server';
  const { logout } = await import('@/lib/telegram/client');
  const phone = String(formData.get('phone') || '');
  if (phone) await logout(phone);
}

export default async function AccountsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const accounts = await db.telegramAccount.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      phone: true,
      status: true,
      fullName: true,
      username: true,
      isClone: true,
      createdAt: true,
      updatedAt: true,
      customProxy: true,
      proxyAssignments: { include: { proxy: true }, take: 1 },
    },
  });

  const isAdmin = user.role === 'owner' || user.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Phone className="size-6" /> حساباتي
          </h1>
          <p className="text-sm text-muted-foreground mt-1">إدارة حسابات تيليجرام + البروكسي المخصص لكل حساب</p>
        </div>
        <Button asChild className="gap-1.5">
          <Link href="/telegram-login"><Plus className="size-4" /> إضافة حساب</Link>
        </Button>
      </div>

      {/* Hybrid proxy explanation */}
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Globe className="size-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-emerald-700 dark:text-emerald-400">🌐 نظام البروكسي الهجين</p>
              <p className="text-xs text-muted-foreground mt-1">
                كل حساب يحصل على <strong>بروكسي تلقائي</strong> من المطور (لتوزيع IP).
                يمكنك تعيين <strong>بروكسي مخصص</strong> لكل حساب لتجاوز الإعداد الافتراضي.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Phone className="size-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium">لا توجد حسابات مضافة بعد</p>
            <p className="text-sm text-muted-foreground mt-1">ابدأ بإضافة أول حساب تيليجرام خاص بك</p>
            <Button asChild className="mt-4 gap-1.5">
              <Link href="/telegram-login"><Plus className="size-4" /> إضافة حساب</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {accounts.map((acc) => {
            const effectiveProxy = acc.customProxy || acc.proxyAssignments[0]?.proxy;
            const proxyType = acc.customProxy ? 'custom' : (acc.proxyAssignments[0]?.proxy ? 'auto' : 'none');
            return (
              <Card key={acc.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base font-mono" dir="ltr">{acc.phone}</CardTitle>
                    <div className="flex items-center gap-2">
                      {acc.isClone && <Badge variant="secondary">clone</Badge>}
                      <Badge variant={acc.status === 'idle' ? 'default' : 'outline'}>{acc.status}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground mb-3">
                    {acc.fullName ? `الاسم: ${acc.fullName}` : 'بدون اسم'}{' '}
                    {acc.username && `· @${acc.username}`}
                  </p>

                  {/* Proxy status badge */}
                  <div className="flex items-center gap-2 mb-3 p-2 rounded-md bg-muted/50">
                    <Server className="size-3.5 text-muted-foreground" />
                    <span className="text-xs">البروكسي:</span>
                    {proxyType === 'none' ? (
                      <Badge variant="outline" className="text-amber-600">لا يوجد (مباشر)</Badge>
                    ) : proxyType === 'custom' ? (
                      <Badge className="bg-purple-500/20 text-purple-700 dark:text-purple-400 gap-1">
                        <User className="size-3" /> مخصص
                      </Badge>
                    ) : (
                      <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-400 gap-1">
                        <Globe className="size-3" /> تلقائي
                      </Badge>
                    )}
                    {effectiveProxy && (
                      <span className="text-xs font-mono text-muted-foreground" dir="ltr">
                        {effectiveProxy.host}:{effectiveProxy.port}
                      </span>
                    )}
                  </div>

                  <AccountProxyManager accountId={acc.id} phone={acc.phone} />

                  <div className="mt-3 flex items-center justify-between gap-2 pt-3 border-t">
                    <p className="text-xs text-muted-foreground">
                      أضيف: {new Date(acc.createdAt).toLocaleDateString('ar')}
                    </p>
                    <form action={deleteAccount}>
                      <input type="hidden" name="phone" value={acc.phone} />
                      <Button type="submit" variant="outline" size="sm" className="text-red-500 hover:text-red-600">
                        تسجيل خروج وحذف
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

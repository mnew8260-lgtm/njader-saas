import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { Phone, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Phone className="size-6" /> حساباتي
          </h1>
          <p className="text-sm text-muted-foreground mt-1">إدارة حسابات تيليجرام المضافة</p>
        </div>
        <Button asChild className="gap-1.5">
          <Link href="/telegram-login"><Plus className="size-4" /> إضافة حساب</Link>
        </Button>
      </div>

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
          {accounts.map((acc) => (
            <Card key={acc.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base font-mono" dir="ltr">{acc.phone}</CardTitle>
                  <div className="flex items-center gap-2">
                    {acc.isClone && <Badge variant="secondary">clone</Badge>}
                    <Badge variant={acc.status === 'idle' ? 'default' : 'outline'}>{acc.status}</Badge>
                  </div>
                </div>
                <CardDescription>
                  {acc.fullName ? `الاسم: ${acc.fullName}` : 'بدون اسم'}{' '}
                  {acc.username && `· @${acc.username}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  أضيف: {new Date(acc.createdAt).toLocaleString('ar')}
                  {acc.updatedAt && ` · آخر تحديث: ${new Date(acc.updatedAt).toLocaleString('ar')}`}
                </p>
                <form action={deleteAccount}>
                  <input type="hidden" name="phone" value={acc.phone} />
                  <Button type="submit" variant="outline" size="sm" className="text-red-500 hover:text-red-600">
                    تسجيل خروج وحذف
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

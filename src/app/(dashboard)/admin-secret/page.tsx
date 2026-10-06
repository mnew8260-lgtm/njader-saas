import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { KeyRound, Users, Activity, ArrowLeft, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function AdminSecretPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  if (user.role !== 'owner' && user.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto py-12">
        <Card className="border-red-500/40 bg-red-500/5">
          <CardContent className="py-8 text-center">
            <ShieldAlert className="size-12 mx-auto text-red-500 mb-3" />
            <p className="text-lg font-bold">صلاحيات غير كافية</p>
            <p className="text-sm text-muted-foreground mt-1">هذه الصفحة مخصصة للمالك أو المسؤول فقط</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [usersCount, accountsCount, poolCount, recentActivities] = await Promise.all([
    db.user.count(),
    db.telegramAccount.count(),
    db.apiCredential.count({ where: { enabled: true } }),
    db.activityLog.findMany({ take: 10, orderBy: { createdAt: 'desc' }, include: { user: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldAlert className="size-6" /> لوحة المالك
        </h1>
        <p className="text-sm text-muted-foreground mt-1">إدارة النظام · API pool · المستخدمين</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <Users className="size-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">المستخدمون</span>
            </div>
            <p className="text-2xl font-bold mt-2">{usersCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <KeyRound className="size-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">API Pool</span>
            </div>
            <p className="text-2xl font-bold mt-2">{poolCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <Activity className="size-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">الحسابات</span>
            </div>
            <p className="text-2xl font-bold mt-2">{accountsCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">إدارة API Pool</CardTitle>
          <CardDescription>أضف أو احذف بيانات api_id و api_hash التي يستخدمها المستخدمون تلقائياً</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="gap-1.5">
            <Link href="/admin/api-pool"><ArrowLeft className="size-4" /> الذهاب لإدارة API</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="size-4" /> آخر النشاطات
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">لا توجد نشاطات بعد</p>
          ) : (
            <ul className="space-y-2">
              {recentActivities.map((log) => (
                <li key={log.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                  <div>
                    <p className="font-mono">{log.action}</p>
                    <p className="text-xs text-muted-foreground">{log.detail}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString('ar')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getOwnerStats, SUBSCRIPTION_PLANS } from '@/lib/subscription';
import { UsersManager } from '@/components/admin/UsersManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role !== 'owner' && user.role !== 'admin') {
    return <div className="text-center py-12">صلاحيات غير كافية</div>;
  }

  const stats = await getOwnerStats();
  const plans = SUBSCRIPTION_PLANS;

  const statCards = [
    { label: 'بانتظار الموافقة', value: stats.pending, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'مفعّل', value: stats.approved, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'مرفوض', value: stats.rejected, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: 'منتهي', value: stats.expired, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'إجمالي المستخدمين', value: stats.totalUsers, color: 'text-zinc-700 dark:text-zinc-300', bg: 'bg-zinc-500/10' },
    { label: 'إجمالي الحسابات', value: stats.totalAccounts, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">إدارة المستخدمين والاشتراكات</h1>
        <p className="text-sm text-muted-foreground mt-1">
          راجع طلبات الاشتراك الجديدة، وافق أو ارفض، وحدد مدة الاشتراك لكل مستخدم
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className={`${s.bg} border-0`}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">خطط الاشتراك المتاحة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {plans.map((p) => (
              <div key={p.id} className="p-3 rounded-md border text-center">
                <p className="font-semibold text-sm">{p.label}</p>
                <p className="text-xs text-muted-foreground">
                  {p.days ? `${p.days} يوم` : 'مدى الحياة'}
                </p>
                <p className="text-xs font-mono mt-1">${p.price}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <UsersManager />
    </div>
  );
}

import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { Phone, Users, KeyRound, Plus, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [accountsCount, apiPoolCount] = await Promise.all([
    db.telegramAccount.count({ where: { ownerId: user.id } }),
    db.apiCredential.count({ where: { enabled: true } }),
  ]);

  const isAdmin = user.role === 'owner' || user.role === 'admin';

  const cards = [
    {
      title: 'حساباتي على تيليجرام',
      value: accountsCount,
      icon: <Users className="size-5" />,
      href: '/accounts',
      desc: 'إدارة الحسابات المضافة',
    },
    {
      title: 'إضافة حساب جديد',
      value: '+',
      icon: <Plus className="size-5" />,
      href: '/telegram-login',
      desc: 'تسجيل دخول تيليجرام بخطوة واحدة',
    },
    {
      title: 'API Pool',
      value: apiPoolCount,
      icon: <KeyRound className="size-5" />,
      href: '/admin/api-pool',
      desc: 'إدارة بيانات API credentials',
      adminOnly: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">مرحباً، {user.displayName || user.username || user.email} 👋</h1>
        <p className="text-sm text-muted-foreground mt-1">
          لوحة تحكم NJADDER SaaS — أضف حسابات تيليجرام وأدرها بسهولة
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards
          .filter((c) => !c.adminOnly || isAdmin)
          .map((c) => (
            <Link key={c.title} href={c.href}>
              <Card className="hover:border-zinc-400 dark:hover:border-zinc-700 transition-colors h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
                    <div className="size-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 grid place-items-center">
                      {c.icon}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{c.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{c.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
      </div>

      {apiPoolCount === 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-3 py-4">
            <KeyRound className="size-5 text-amber-500 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm">لا يوجد API credentials في الـ pool بعد</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                بدون API، لن يتمكن المستخدمون من تسجيل الدخول. احصل على بيانات من my.telegram.org/apps وأضفها.
              </p>
            </div>
            {isAdmin && (
              <Button asChild size="sm" className="gap-1.5">
                <Link href="/admin/api-pool">
                  <ArrowLeft className="size-4" /> إضافة API
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="size-4" /> كيف يعمل تسجيل الدخول؟
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ol className="list-decimal list-inside space-y-2">
            <li>أدخل رقم هاتفك (مع رمز الدولة) في صفحة «إضافة حساب».</li>
            <li>سيصلك كود تحقق على تطبيق تيليجرام — أدخله في الخطوة التالية.</li>
            <li>إذا كانت الخاصية الثنائية (2FA) مفعّلة، أدخل كلمة المرور الثنائية.</li>
            <li>يتم حفظ الجلسة بأمان في قاعدة البيانات ولا تحتاج لإعادة تسجيل الدخول.</li>
          </ol>
          <p className="text-xs pt-2 border-t">
            النظام يستخدم GramJS ويعمل بشكل كامل في بيئة serverless (Vercel/Render/محلي).
            لا يحفظ كلمات المرور، فقط session string المشفّر.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

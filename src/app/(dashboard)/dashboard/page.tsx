import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  Phone, Users, KeyRound, Plus, ArrowLeft,
  Terminal, ShieldCheck, Globe, Activity,
  CheckCircle2, Calendar, Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

function formatDate(s: Date | null): string {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('ar', { year: 'numeric', month: 'long', day: 'numeric' });
}

function daysLeft(end: Date | null): number | null {
  if (!end) return null;
  const ms = new Date(end).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [accountsCount, apiPoolCount, commandsCount, lastAccount] = await Promise.all([
    db.telegramAccount.count({ where: { ownerId: user.id } }),
    db.apiCredential.count({ where: { enabled: true } }),
    db.commandExecution.count({ where: { userId: user.id } }),
    db.telegramAccount.findFirst({
      where: { ownerId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { phone: true, fullName: true, status: true, updatedAt: true },
    }),
  ]);

  const isAdmin = user.role === 'owner' || user.role === 'admin';
  const daysRemaining = daysLeft(user.subscriptionEndsAt);

  // Build a comprehensive grid of ALL features
  const features = [
    {
      title: 'إضافة حساب تيليجرام',
      desc: 'سجّل دخول حساب جديد بخطوات بسيطة (هاتف → كود → 2FA)',
      icon: <Plus className="size-5" />,
      href: '/telegram-login',
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      stat: accountsCount > 0 ? `${accountsCount} حساب مضاف` : 'ابدأ الآن',
    },
    {
      title: 'حساباتي على تيليجرام',
      desc: 'إدارة الحسابات المضافة — عرض، حذف، فحص الحالة',
      icon: <Users className="size-5" />,
      href: '/accounts',
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      stat: `${accountsCount} حساب`,
    },
    {
      title: 'مدير الأوامر',
      desc: 'نفّذ 57 أمر تيليجرام (إرسال، حظر، خصوصية، أمان…)',
      icon: <Terminal className="size-5" />,
      href: '/commands',
      color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
      stat: `${commandsCount} عملية منفّذة`,
    },
    {
      title: 'فاحص الحظر',
      desc: 'تحقق من حالة حساباتك — هل هي محظورة؟ محدودة؟',
      icon: <ShieldCheck className="size-5" />,
      href: '/ban-checker',
      color: 'bg-red-500/10 text-red-600 dark:text-red-400',
      stat: 'فحص فوري',
    },
    ...(isAdmin ? [{
      title: 'إدارة الاشتراكات',
      desc: 'راجع طلبات الاشتراك الجديدة، وافق أو ارفض المستخدمين',
      icon: <Users className="size-5" />,
      href: '/admin/users',
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      stat: 'لوحة المالك',
    }] : []),
    ...(isAdmin ? [{
      title: 'مدير البروكسي',
      desc: 'أضف واختبر واربط بروكسيات SOCKS5/HTTP بحساباتك',
      icon: <Globe className="size-5" />,
      href: '/proxy-manager',
      color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
      stat: 'إدارة البروكسي',
    }] : []),
    ...(isAdmin ? [{
      title: 'API Pool',
      desc: 'إدارة بيانات API credentials (api_id, api_hash)',
      icon: <KeyRound className="size-5" />,
      href: '/admin/api-pool',
      color: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
      stat: `${apiPoolCount} API`,
    }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            مرحباً، {user.displayName || user.username || user.email} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            لوحة تحكم NJADDER SaaS — أضف حسابات تيليجرام وأدرها بسهولة
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user.role === 'owner' || user.role === 'admin' ? (
            <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 gap-1">
              <Sparkles className="size-3" /> {user.role === 'owner' ? 'المالك' : 'مشرف'}
            </Badge>
          ) : (
            <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 gap-1">
              <CheckCircle2 className="size-3" /> مشترك
            </Badge>
          )}
          {user.subscriptionPlan && (
            <Badge variant="outline" className="gap-1">
              <Calendar className="size-3" />
              {user.subscriptionPlan === 'lifetime' ? 'مدى الحياة' :
               user.subscriptionPlan === 'year' ? 'سنة' :
               user.subscriptionPlan === 'half_year' ? '6 أشهر' :
               user.subscriptionPlan === 'quarter' ? '3 أشهر' :
               user.subscriptionPlan === 'month' ? 'شهر' :
               user.subscriptionPlan === 'week' ? 'أسبوع' :
               user.subscriptionPlan}
              {daysRemaining !== null && daysRemaining > 0 && ` · ${daysRemaining} يوم`}
            </Badge>
          )}
        </div>
      </div>

      {/* Latest account activity */}
      {lastAccount ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="flex items-center justify-between gap-3 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-10 rounded-full bg-emerald-500/20 grid place-items-center shrink-0">
                <Phone className="size-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {lastAccount.fullName || lastAccount.phone}
                </p>
                <p className="text-xs text-muted-foreground font-mono" dir="ltr">{lastAccount.phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="text-xs">{lastAccount.status}</Badge>
              <Button asChild size="sm" variant="outline">
                <Link href="/accounts">إدارة</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-3 py-4">
            <Plus className="size-5 text-amber-500 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm">لا توجد حسابات تيليجرام مضافة بعد</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                ابدأ بإضافة حسابك الأول — سجّل دخول تيليجرام في خطوات بسيطة
              </p>
            </div>
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/telegram-login">
                <ArrowLeft className="size-4" /> إضافة حساب
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* All Features Grid */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
          <Activity className="size-4" /> كل الميزات المتاحة لك
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <Link key={f.href} href={f.href}>
              <Card className="hover:border-zinc-400 dark:hover:border-zinc-700 hover:shadow-md transition-all h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{f.title}</CardTitle>
                    <div className={`size-9 rounded-lg grid place-items-center ${f.color}`}>
                      {f.icon}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{f.desc}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-primary">{f.stat}</span>
                    <ArrowLeft className="size-3 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="size-4" /> كيف يعمل تسجيل الدخول إلى تيليجرام؟
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <ol className="list-decimal list-inside space-y-2">
            <li>أدخل رقم هاتفك (مع رمز الدولة) في صفحة «إضافة حساب تيليجرام».</li>
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

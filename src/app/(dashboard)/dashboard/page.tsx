import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  Phone, Users, KeyRound, Plus, ArrowLeft,
  Terminal, ShieldCheck, Globe, Activity,
  CheckCircle2, Calendar, Sparkles, Users2, Lock, Filter, FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

function daysLeft(end: Date | null): number | null {
  if (!end) return null;
  const ms = new Date(end).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [accountsCount, apiPoolCount, commandsCount, exportsCount, lastAccount] = await Promise.all([
    db.telegramAccount.count({ where: { ownerId: user.id } }),
    db.apiCredential.count({ where: { enabled: true } }),
    db.commandExecution.count({ where: { userId: user.id } }),
    db.scrapeExport.count({ where: { userId: user.id } }),
    db.telegramAccount.findFirst({
      where: { ownerId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { phone: true, fullName: true, username: true, status: true },
    }),
  ]);

  const isAdmin = user.role === 'owner' || user.role === 'admin';
  const daysRemaining = daysLeft(user.subscriptionEndsAt);

  const features = [
    {
      title: 'إضافة حساب',
      desc: 'سجّل دخول تيليجرام',
      icon: <Plus className="size-5" />,
      href: '/telegram-login',
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      stat: accountsCount > 0 ? `${accountsCount} حساب` : 'ابدأ',
    },
    {
      title: 'حساباتي',
      desc: 'إدارة الحسابات + البروكسي',
      icon: <Users className="size-5" />,
      href: '/accounts',
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      stat: `${accountsCount} حساب`,
    },
    {
      title: 'السحب والإضافة',
      desc: 'سحب أعضاء + نقل + DM',
      icon: <Users2 className="size-5" />,
      href: '/mass-tools',
      color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      stat: 'الأقوى',
    },
    {
      title: 'مدير الأوامر',
      desc: '158+ أمر تيليجرام',
      icon: <Terminal className="size-5" />,
      href: '/commands',
      color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
      stat: `${commandsCount} عملية`,
    },
    {
      title: 'ملفات السحب',
      desc: 'تنزيل نتائج TXT/CSV/JSON',
      icon: <FileText className="size-5" />,
      href: '/exports',
      color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
      stat: `${exportsCount} ملف`,
    },
    {
      title: 'التسجيل الآمن',
      desc: '2FA + الجلسات النشطة',
      icon: <Lock className="size-5" />,
      href: '/secure-login',
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      stat: 'حماية',
    },
    {
      title: 'فاحص الحظر',
      desc: 'فحص حالة الحسابات',
      icon: <ShieldCheck className="size-5" />,
      href: '/ban-checker',
      color: 'bg-red-500/10 text-red-600 dark:text-red-400',
      stat: 'فحص',
    },
    ...(isAdmin ? [{
      title: 'الاشتراكات',
      desc: 'موافقة/رفض المستخدمين',
      icon: <span className="text-xl">👥</span>,
      href: '/admin/users',
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      stat: 'لوحة المالك',
    }] : []),
  ];

  return (
    <div className="space-y-4">
      {/* Greeting */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          {user.displayName || user.username} 👋
        </h1>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {isAdmin ? (
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
               user.subscriptionPlan === 'month' ? 'شهر' : user.subscriptionPlan}
              {daysRemaining !== null && daysRemaining > 0 && ` · ${daysRemaining}ي`}
            </Badge>
          )}
        </div>
      </div>

      {/* Latest account */}
      {lastAccount ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="flex items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-10 rounded-full bg-emerald-500/20 grid place-items-center shrink-0">
                <Phone className="size-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate text-sm">{lastAccount.fullName || lastAccount.phone}</p>
                <p className="text-xs text-muted-foreground font-mono" dir="ltr">{lastAccount.phone}</p>
              </div>
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link href="/accounts">إدارة</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="font-medium text-sm">لا توجد حسابات تيليجرام</p>
              <p className="text-xs text-muted-foreground mt-0.5">ابدأ بإضافة حسابك الأول</p>
            </div>
            <Button asChild size="sm" className="gap-1.5 shrink-0">
              <Link href="/telegram-login">
                <Plus className="size-4" /> إضافة
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick actions grid (mobile-first: 2 columns) */}
      <div>
        <h2 className="text-xs font-medium text-muted-foreground mb-2 px-1">الميزات</h2>
        <div className="grid grid-cols-2 gap-2">
          {features.map((f) => (
            <Link key={f.href} href={f.href}>
              <Card className="hover:border-zinc-400 dark:hover:border-zinc-700 hover:shadow-md active:scale-98 transition-all">
                <CardContent className="p-3">
                  <div className={`size-9 rounded-lg grid place-items-center mb-2 ${f.color}`}>
                    {f.icon}
                  </div>
                  <p className="font-medium text-sm leading-tight">{f.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight line-clamp-1">{f.desc}</p>
                  <p className="text-[10px] font-medium text-primary mt-1.5">{f.stat}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import {
  Phone, KeyRound, Shield, ArrowLeft, Activity, Zap, Users2, Lock,
  Terminal, ShieldCheck, Globe, Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

const features = [
  { icon: <Phone className="size-5" />, title: 'تسجيل دخول بخطوة واحدة', desc: 'أدخل رقم الهاتف فقط — لا حاجة لإدخال api_id أو api_hash.' },
  { icon: <Shield className="size-5" />, title: 'آمن ومشفّر', desc: 'جلسات تيليجرام كـ StringSession بأمان في قاعدة البيانات.' },
  { icon: <KeyRound className="size-5" />, title: 'API Pool تلقائي', desc: 'يدور النظام بين عدة API credentials لتجنب FloodWait.' },
  { icon: <Zap className="size-5" />, title: 'Serverless جاهز', desc: 'يعمل على Vercel و Render ومحلياً بدون أي إعدادات معقدة.' },
  { icon: <Users2 className="size-5" />, title: 'سحب ونقل أعضاء', desc: 'سحب أعضاء من قروب مصدر وإضافتهم لقروب هدف تلقائياً.' },
  { icon: <Lock className="size-5" />, title: 'تسجيل آمن (2FA)', desc: 'إدارة التحقق الثنائي، الجلسات النشطة، استعادة الحساب.' },
  { icon: <Terminal className="size-5" />, title: '143+ أمر تيليجرام', desc: 'في 21 تصنيف: حساب، رسائل، مجموعات، خصوصية، أمان…' },
  { icon: <Filter className="size-5" />, title: 'فلاتر متقدمة', desc: 'فلترة الأعضاء حسب: الدولة، آخر ظهور، Premium، اللغة…' },
  { icon: <ShieldCheck className="size-5" />, title: 'فاحص الحظر', desc: 'تحقق من حالة حساباتك — هل هي محظورة؟ محدودة؟ تعمل؟' },
  { icon: <Globe className="size-5" />, title: 'مدير البروكسي', desc: 'أضف واختبر واربط بروكسيات SOCKS5/HTTP بحساباتك.' },
];

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <div className="container mx-auto max-w-5xl px-4 py-6">
        <header className="flex items-center justify-between mb-12">
          <Link href="/" className="flex items-center gap-2">
            <div className="size-10 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-700 dark:from-white dark:to-zinc-300 text-white dark:text-zinc-900 font-bold grid place-items-center text-lg lowercase">n</div>
            <span className="text-xl font-bold lowercase">njadder</span>
          </Link>
          <nav className="flex items-center gap-2">
            {user ? (
              <Button asChild>
                <Link href="/dashboard">لوحة التحكم <ArrowLeft className="size-4" /></Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild><Link href="/login">دخول</Link></Button>
                <Button asChild><Link href="/signup">إنشاء حساب</Link></Button>
              </>
            )}
          </nav>
        </header>

        <section className="text-center py-12 sm:py-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs mb-6">
            <Activity className="size-3" /> v2.0 — يعمل فعلياً · 143+ أمر
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-4 lowercase">
            njadder
          </h1>
          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            منصة تيليجرام الاحترافية الموحدة — تسجيل دخول آمن، إدارة حسابات، سحب وإضافة أعضاء، فلاتر متقدمة، فاحص حظر، ومدير بروكسي.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {user ? (
              <Button size="lg" asChild className="gap-1.5">
                <Link href="/telegram-login">إضافة حساب تيليجرام <ArrowLeft className="size-4" /></Link>
              </Button>
            ) : (
              <>
                <Button size="lg" asChild className="gap-1.5">
                  <Link href="/signup">ابدأ الآن مجاناً <ArrowLeft className="size-4" /></Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/login">لدي حساب بالفعل</Link>
                </Button>
              </>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pb-16">
          {features.map((f) => (
            <Card key={f.title}>
              <CardHeader className="pb-3">
                <div className="size-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 grid place-items-center mb-2">{f.icon}</div>
                <CardTitle className="text-base">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">{f.desc}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="pb-16 text-center">
          <h2 className="text-2xl font-bold mb-6">📊 الإحصائيات</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card><CardContent className="pt-6"><div className="text-3xl font-bold">143+</div><div className="text-xs text-muted-foreground mt-1">أمر تيليجرام</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-3xl font-bold">21</div><div className="text-xs text-muted-foreground mt-1">تصنيف</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-3xl font-bold">20</div><div className="text-xs text-muted-foreground mt-1">دولة مدعومة</div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="text-3xl font-bold">100%</div><div className="text-xs text-muted-foreground mt-1">يعمل فعلياً</div></CardContent></Card>
          </div>
        </section>

        <footer className="py-8 text-center text-xs text-muted-foreground border-t">
          © 2026 njadder · <a href="https://t.me/NMDDER_DEV" target="_blank" rel="noreferrer" className="text-primary underline">@NMDDER_DEV</a>
        </footer>
      </div>
    </div>
  );
}

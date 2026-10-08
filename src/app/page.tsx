import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import {
  Phone, KeyRound, Shield, ArrowLeft, Activity, Zap, Users2, Lock,
  Terminal, ShieldCheck, Globe, Filter, CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

const features = [
  { icon: <Phone className="size-5" />, title: 'تسجيل دخول آمن', desc: 'أدخل رقم الهاتف فقط — لا حاجة لـ api_id أو api_hash' },
  { icon: <Shield className="size-5" />, title: 'جلسات مشفّرة', desc: 'StringSession بأمان في قاعدة البيانات' },
  { icon: <KeyRound className="size-5" />, title: 'API Pool تلقائي', desc: 'يدور بين عدة API credentials لتجنب FloodWait' },
  { icon: <Zap className="size-5" />, title: 'Multi-Account', desc: 'توزيع العمل على عدة حسابات بالتوازي' },
  { icon: <Users2 className="size-5" />, title: 'سحب ونقل أعضاء', desc: 'من قروب مصدر لقروب هدف تلقائياً' },
  { icon: <Lock className="size-5" />, title: '2FA + إدارة جلسات', desc: 'تفعيل، تغيير، إنهاء جلسات مشبوهة' },
  { icon: <Terminal className="size-5" />, title: '172+ أمر', desc: 'في 21 تصنيف: حساب، رسائل، مجموعات، خصوصية...' },
  { icon: <Filter className="size-5" />, title: 'فلاتر متقدمة', desc: 'حسب الدولة، آخر ظهور، Premium، اللغة...' },
  { icon: <ShieldCheck className="size-5" />, title: 'فاحص الحظر', desc: 'تحقق من حالة حساباتك على تيليجرام' },
  { icon: <Globe className="size-5" />, title: 'proxy هجين', desc: 'auto-assign + بروكسي مخصص لكل حساب' },
];

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-blue-950 dark:via-zinc-950 dark:to-blue-950">
      <div className="container mx-auto max-w-6xl px-4 py-6">
        <header className="flex items-center justify-between mb-12">
          <Link href="/" className="flex items-center gap-2">
            <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold grid place-items-center text-xl lowercase shadow-lg shadow-primary/30">n</div>
            <span className="text-xl font-bold lowercase text-gradient-blue">njadder</span>
          </Link>
          <nav className="flex items-center gap-2">
            {user ? (
              <Button asChild className="gap-1.5 shadow-md shadow-primary/25">
                <Link href="/dashboard">لوحة التحكم <ArrowLeft className="size-4" /></Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild><Link href="/login">دخول</Link></Button>
                <Button asChild className="shadow-md shadow-primary/25"><Link href="/signup">إنشاء حساب</Link></Button>
              </>
            )}
          </nav>
        </header>

        <section className="text-center py-12 sm:py-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs mb-6 font-medium">
            <Activity className="size-3" /> v2.0 — يعمل فعلياً · 172+ أمر
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-4">
            <span className="text-gradient-blue lowercase">njadder</span>
          </h1>
          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            منصة تيليجرام الاحترافية الموحدة — تسجيل دخول آمن، سحب وإضافة أعضاء، فلاتر متقدمة، proxy هجين، و172+ أمر.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {user ? (
              <Button size="lg" asChild className="gap-1.5 shadow-lg shadow-primary/30">
                <Link href="/telegram-login">إضافة حساب تيليجرام <ArrowLeft className="size-4" /></Link>
              </Button>
            ) : (
              <>
                <Button size="lg" asChild className="gap-1.5 shadow-lg shadow-primary/30">
                  <Link href="/signup">ابدأ الآن مجاناً <ArrowLeft className="size-4" /></Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/login">لدي حساب بالفعل</Link>
                </Button>
              </>
            )}
          </div>
        </section>

        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pb-16">
          {features.map((f) => (
            <Card key={f.title} className="card-hover border-primary/10">
              <CardHeader className="pb-2">
                <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center mb-2">{f.icon}</div>
                <CardTitle className="text-sm">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">{f.desc}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="pb-16">
          <h2 className="text-2xl font-bold text-center mb-8">📊 الإحصائيات</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="card-hover text-center border-primary/10">
              <CardContent className="pt-6">
                <div className="text-4xl font-extrabold text-primary">172+</div>
                <div className="text-xs text-muted-foreground mt-1">أمر تيليجرام</div>
              </CardContent>
            </Card>
            <Card className="card-hover text-center border-primary/10">
              <CardContent className="pt-6">
                <div className="text-4xl font-extrabold text-primary">21</div>
                <div className="text-xs text-muted-foreground mt-1">تصنيف</div>
              </CardContent>
            </Card>
            <Card className="card-hover text-center border-primary/10">
              <CardContent className="pt-6">
                <div className="text-4xl font-extrabold text-primary">20</div>
                <div className="text-xs text-muted-foreground mt-1">دولة مدعومة</div>
              </CardContent>
            </Card>
            <Card className="card-hover text-center border-primary/10">
              <CardContent className="pt-6">
                <div className="text-4xl font-extrabold text-primary">100%</div>
                <div className="text-xs text-muted-foreground mt-1">يعمل فعلياً</div>
              </CardContent>
            </Card>
          </div>
        </section>

        <footer className="py-8 text-center text-xs text-muted-foreground border-t border-primary/10">
          © 2026 njadder · <a href="https://t.me/NMDDER_DEV" target="_blank" rel="noreferrer" className="text-primary underline">@NMDDER_DEV</a>
        </footer>
      </div>
    </div>
  );
}

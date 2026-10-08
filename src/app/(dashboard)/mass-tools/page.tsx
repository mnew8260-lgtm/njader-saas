import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MassToolsClient } from '@/components/mass-tools/MassToolsClient';

export const dynamic = 'force-dynamic';

export default async function MassToolsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const accounts = await db.telegramAccount.findMany({
    where: { ownerId: user.id, sessionString: { not: null } },
    select: { id: true, phone: true, fullName: true, username: true, status: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">أدوات السحب والإضافة الجماعية</h1>
        <p className="text-sm text-muted-foreground mt-1">
          سحب الأعضاء من قروب مصدر، نقلهم لقروب هدف، إرسال DM جماعي، طرد/حظر/كتم جماعي
        </p>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium">لا توجد حسابات تيليجرام</p>
            <p className="text-sm text-muted-foreground mt-1">
              أضف حساباً أولاً من <a href="/telegram-login" className="text-primary underline">صفحة تسجيل الدخول</a>
            </p>
          </CardContent>
        </Card>
      ) : (
        <MassToolsClient accounts={accounts} />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">⚠️ تحذيرات مهمة</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>• لا تسحب أكثر من <strong>1000 عضو</strong> يومياً من نفس المجموعة</p>
          <p>• لا تضف أكثر من <strong>50 عضو</strong> يومياً لقروب هدف بنفس الحساب</p>
          <p>• استخدم تأخير <strong>5-15 ثانية</strong> بين كل عملية</p>
          <p>• توقف فوراً عند ظهور FloodWait</p>
          <p>• استخدم <strong>بروكسي مختلف</strong> لكل حساب عند تكرار العملية</p>
          <p>• تيليجرام قد يحظر الحسابات التي تسيء استخدام هذه الميزات</p>
        </CardContent>
      </Card>
    </div>
  );
}

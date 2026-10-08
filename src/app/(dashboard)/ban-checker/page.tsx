import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { BanChecker } from '@/components/ban-checker/BanChecker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function BanCheckerPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const accounts = await db.telegramAccount.findMany({
    where: { ownerId: user.id },
    select: {
      id: true, phone: true, fullName: true, username: true, status: true,
      banChecks: { orderBy: { checkedAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">فاحص الحظر</h1>
        <p className="text-sm text-muted-foreground mt-1">
          تحقق من حالة حساباتك على تيليجرام — هل هي محظورة؟ محدودة؟ تعمل؟
        </p>
      </div>

      <BanChecker accounts={accounts as any} />
    </div>
  );
}

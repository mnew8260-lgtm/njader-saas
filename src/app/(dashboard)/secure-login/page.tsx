import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SecureLoginClient } from '@/components/secure-login/SecureLoginClient';

export const dynamic = 'force-dynamic';

export default async function SecureLoginPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const accounts = await db.telegramAccount.findMany({
    where: { ownerId: user.id, sessionString: { not: null } },
    select: { id: true, phone: true, fullName: true, username: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          🔐 التسجيل الآمن
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          إدارة التحقق الثنائي (2FA)، الجلسات النشطة، كلمات المرور، وبريد الاستعادة
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
        <SecureLoginClient accounts={accounts} />
      )}
    </div>
  );
}

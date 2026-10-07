import { getCurrentUser } from '@/lib/auth';
import { ProxyManager } from '@/components/proxy/ProxyManager';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function ProxyManagerPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role !== 'owner' && user.role !== 'admin') {
    return <div className="text-center py-12">صلاحيات غير كافية</div>;
  }

  // Get user's accounts for assignment
  const accounts = await db.telegramAccount.findMany({
    select: { id: true, phone: true, fullName: true, username: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">مدير البروكسي</h1>
        <p className="text-sm text-muted-foreground mt-1">
          أضف بروكسيات SOCKS5/HTTP/HTTPS واربطها بحسابات تيليجرام لتجنب الحظر
        </p>
      </div>

      <ProxyManager accounts={accounts as any} />
    </div>
  );
}

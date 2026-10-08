import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ExportsListClient } from '@/components/exports/ExportsListClient';

export const dynamic = 'force-dynamic';

export default async function ExportsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const exports = await db.scrapeExport.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      commandId: true,
      commandName: true,
      format: true,
      sourcePeer: true,
      totalCount: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          📁 ملفات السحب المُصدَّرة
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          كل عملية سحب أو فلترة تنشئ ملفاً تلقائياً — تنزيل بصيغة TXT/CSV/JSON
        </p>
      </div>

      <ExportsListClient exports={exports as any} />
    </div>
  );
}

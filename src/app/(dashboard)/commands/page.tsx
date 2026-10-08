import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { CommandRunner } from '@/components/commands/CommandRunner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function CommandsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  // Get user's accounts
  const accounts = await db.telegramAccount.findMany({
    where: { ownerId: user.id, sessionString: { not: null } },
    select: { id: true, phone: true, fullName: true, username: true, status: true },
    orderBy: { createdAt: 'desc' },
  });

  // Get recent history
  const history = await db.commandExecution.findMany({
    where: { userId: user.id },
    orderBy: { executedAt: 'desc' },
    take: 20,
    select: {
      id: true,
      commandId: true,
      commandName: true,
      input: true,
      output: true,
      status: true,
      duration: true,
      executedAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">مدير الأوامر</h1>
        <p className="text-sm text-muted-foreground mt-1">
          اختر حساباً ونفّذ أي من 50+ أمر لإدارة حساباتك على تيليجرام
        </p>
      </div>

      <CommandRunner accounts={accounts} history={history} />
    </div>
  );
}

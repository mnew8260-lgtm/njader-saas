import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { DashboardNav } from '@/components/dashboard/nav';

export const metadata: Metadata = {
  title: 'لوحة التحكم · njadder',
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?next=/dashboard');
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
      <DashboardNav user={user} />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">{children}</main>
      <footer className="mt-auto py-4 text-center text-xs text-muted-foreground border-t">
        © 2026 njadder · <a href="https://t.me/NMDDER_DEV" className="text-primary underline" target="_blank" rel="noreferrer">@NMDDER_DEV</a>
      </footer>
    </div>
  );
}

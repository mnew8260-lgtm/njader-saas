import type { Metadata, Viewport } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { MobileAppNav } from '@/components/mobile/BottomNav';

export const metadata: Metadata = {
  title: 'njadder · لوحة التحكم',
  description: 'إدارة حسابات تيليجرام، سحب وإضافة أعضاء، 158+ أمر',
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?next=/dashboard');
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileAppNav user={user} />
      <main className="flex-1 container mx-auto max-w-md px-4 py-4 pb-24">
        {children}
      </main>
    </div>
  );
}

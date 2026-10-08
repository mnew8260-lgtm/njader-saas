import type { Metadata, Viewport } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { AppSidebar } from '@/components/mobile/BottomNav';

export const metadata: Metadata = {
  title: 'njadder · لوحة التحكم',
  description: 'إدارة حسابات تيليجرام، سحب وإضافة أعضاء، 172+ أمر',
};

export const viewport: Viewport = {
  themeColor: '#1e3a8a',
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
    <div className="min-h-screen bg-background">
      <AppSidebar user={user} />
      <main className="lg:pr-72">
        <div className="container mx-auto max-w-4xl px-4 py-6 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

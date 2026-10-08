import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'njadder · تسجيل الدخول',
};

export const viewport: Viewport = {
  themeColor: '#1e3a8a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-blue-950 dark:via-zinc-950 dark:to-blue-950 p-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="w-full max-w-md">
        <a href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold grid place-items-center text-2xl lowercase shadow-lg shadow-primary/30">
            n
          </div>
          <span className="text-3xl font-bold lowercase text-gradient-blue">njadder</span>
        </a>
        {children}
      </div>
    </div>
  );
}

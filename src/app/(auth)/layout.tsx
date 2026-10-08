import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'njadder · تسجيل الدخول',
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 p-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="w-full max-w-md">
        <a href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-700 dark:from-white dark:to-zinc-300 text-white dark:text-zinc-900 font-bold grid place-items-center text-2xl lowercase shadow-lg">
            n
          </div>
          <span className="text-3xl font-bold lowercase tracking-tight">njadder</span>
        </a>
        {children}
      </div>
    </div>
  );
}

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'تسجيل الدخول · njadder',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 p-4">
      <div className="w-full max-w-md">
        <a href="/" className="flex items-center justify-center gap-2 mb-6">
          <div className="size-10 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-700 dark:from-white dark:to-zinc-300 text-white dark:text-zinc-900 font-bold grid place-items-center text-lg lowercase">
            n
          </div>
          <span className="text-2xl font-bold lowercase">njadder</span>
        </a>
        {children}
      </div>
    </div>
  );
}

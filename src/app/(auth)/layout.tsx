import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'تسجيل الدخول · NJADDER',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 p-4">
      <div className="w-full max-w-md">
        <a href="/" className="flex items-center justify-center gap-2 mb-6">
          <div className="size-10 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold grid place-items-center">
            N
          </div>
          <span className="text-2xl font-bold">NJADDER</span>
        </a>
        {children}
      </div>
    </div>
  );
}

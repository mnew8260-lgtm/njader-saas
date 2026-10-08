'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import {
  Home, Plus, Terminal, FileText, Users, LogOut, Menu, X,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import type { AuthUser } from '@/lib/auth';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const PRIMARY_NAV: NavItem[] = [
  { href: '/dashboard',  label: 'الرئيسية',     icon: <Home className="size-5" /> },
  { href: '/accounts',   label: 'حساباتي',      icon: <Users className="size-5" /> },
  { href: '/commands',   label: 'الأوامر',      icon: <Terminal className="size-5" /> },
  { href: '/exports',    label: 'الملفات',       icon: <FileText className="size-5" /> },
];

const SECONDARY_NAV: NavItem[] = [
  { href: '/telegram-login',  label: 'إضافة حساب',    icon: <Plus className="size-4" /> },
  { href: '/mass-tools',      label: 'السحب والإضافة', icon: <Users className="size-4" /> },
  { href: '/secure-login',    label: 'التسجيل الآمن',  icon: <span className="text-base">🔐</span> },
  { href: '/ban-checker',     label: 'فاحص الحظر',   icon: <span className="text-base">🛡️</span> },
];

const ADMIN_NAV: NavItem[] = [
  { href: '/admin/users',    label: 'الاشتراكات',    icon: <span className="text-base">👥</span>, adminOnly: true },
  { href: '/admin/api-pool', label: 'API Pool',     icon: <span className="text-base">🔑</span>, adminOnly: true },
  { href: '/proxy-manager',  label: 'البروكسي',      icon: <span className="text-base">🌐</span>, adminOnly: true },
];

export function MobileAppNav({ user }: { user: AuthUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = user.role === 'owner' || user.role === 'admin';

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  // Lock body scroll when menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const allSecondary = [
    ...SECONDARY_NAV,
    ...(isAdmin ? ADMIN_NAV : []),
  ];

  return (
    <>
      {/* Top bar — only logo + menu button + user */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/95 border-b border-border/50">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 -mr-2 rounded-lg hover:bg-muted active:scale-95 transition"
            aria-label="القائمة"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>

          <Link href="/dashboard" className="flex items-center gap-1.5">
            <div className="size-7 rounded-lg bg-gradient-to-br from-zinc-900 to-zinc-700 dark:from-white dark:to-zinc-300 text-white dark:text-zinc-900 font-bold grid place-items-center text-sm lowercase">n</div>
            <span className="font-bold text-base lowercase">njadder</span>
          </Link>

          <button
            onClick={logout}
            className="p-2 -ml-2 rounded-lg hover:bg-muted active:scale-95 transition text-muted-foreground"
            aria-label="خروج"
          >
            <LogOut className="size-5" />
          </button>
        </div>
      </header>

      {/* Bottom Navigation (mobile-first) — primary 4 items */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border/50 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4 h-16 max-w-md mx-auto">
          {PRIMARY_NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 transition-all active:scale-90 ${
                  active ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <div className={`p-1.5 rounded-xl transition ${active ? 'bg-primary/10' : ''}`}>
                  {item.icon}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Slide-down drawer for secondary nav */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 top-14 bg-black/40 z-30 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <div className="fixed top-14 left-0 right-0 z-30 bg-background border-b border-border/50 animate-in slide-in-from-top duration-200">
            <div className="max-w-md mx-auto p-4 space-y-2 pb-8">
              {/* User card */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 mb-3">
                <div className="size-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 dark:from-zinc-300 dark:to-white text-white dark:text-zinc-900 grid place-items-center font-bold">
                  {(user.displayName || user.username || 'U')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{user.displayName || user.username || user.email}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.accountStatus === 'approved' ? '✓ مشترك' : user.accountStatus}
                    {user.subscriptionPlan && ` · ${user.subscriptionPlan}`}
                  </p>
                </div>
                {isAdmin && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-400 font-medium">
                    {user.role === 'owner' ? '👑 Owner' : '🛡️ Admin'}
                  </span>
                )}
              </div>

              {/* Secondary nav */}
              {allSecondary.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all active:scale-98 ${
                      active ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                    }`}
                  >
                    <div className="size-9 rounded-lg bg-muted grid place-items-center">
                      {item.icon}
                    </div>
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}

              {/* Logout button */}
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-500 hover:bg-red-500/10 transition mt-3"
              >
                <div className="size-9 rounded-lg bg-red-500/10 grid place-items-center">
                  <LogOut className="size-4" />
                </div>
                <span className="text-sm font-medium">تسجيل الخروج</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

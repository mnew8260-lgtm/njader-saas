'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard, Phone, Users, KeyRound, LogOut, Shield,
  Terminal, ShieldCheck, Globe, Users2, Filter, Lock, Menu, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AuthUser } from '@/lib/auth';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { href: '/dashboard',       label: 'الرئيسية',     icon: <LayoutDashboard className="size-4" /> },
  { href: '/telegram-login',  label: 'إضافة حساب',    icon: <Phone className="size-4" /> },
  { href: '/accounts',        label: 'حساباتي',      icon: <Users className="size-4" /> },
  { href: '/mass-tools',      label: 'السحب والإضافة', icon: <Users2 className="size-4" /> },
  { href: '/commands',        label: 'مدير الأوامر',  icon: <Terminal className="size-4" /> },
  { href: '/secure-login',    label: 'التسجيل الآمن',  icon: <Lock className="size-4" /> },
  { href: '/ban-checker',     label: 'فاحص الحظر',   icon: <ShieldCheck className="size-4" /> },
  { href: '/admin/users',    label: 'الاشتراكات',    icon: <Shield className="size-4" />, adminOnly: true },
  { href: '/admin/api-pool', label: 'API Pool',     icon: <KeyRound className="size-4" />, adminOnly: true },
  { href: '/proxy-manager',  label: 'البروكسي',      icon: <Globe className="size-4" />, adminOnly: true },
];

export function DashboardNav({ user }: { user: AuthUser }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const isAdmin = user.role === 'owner' || user.role === 'admin';
  const visibleNav = NAV.filter((n) => !n.adminOnly || isAdmin);

  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-background/90 border-b">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center justify-between px-4 py-3 gap-3">
          {/* Logo + Mobile toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-1.5 rounded-md hover:bg-muted"
              aria-label="menu"
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-gradient-to-br from-zinc-900 to-zinc-700 dark:from-white dark:to-zinc-300 text-white dark:text-zinc-900 font-bold grid place-items-center text-lg lowercase">n</div>
              <span className="font-bold text-lg hidden sm:inline lowercase">njadder</span>
            </Link>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 overflow-x-auto max-w-full">
            {visibleNav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors ${
                    active ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'hover:bg-muted'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {isAdmin && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-700 dark:text-amber-400">
                <Shield className="size-3" /> {user.role === 'owner' ? 'owner' : 'admin'}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={logout} className="gap-1">
              <LogOut className="size-4" /> <span className="hidden sm:inline">خروج</span>
            </Button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <nav className="md:hidden border-t py-2 space-y-1">
            {visibleNav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm ${
                    active ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'hover:bg-muted'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <div className="px-4 pt-2 border-t mt-2">
              <p className="text-xs text-muted-foreground">
                {user.displayName || user.username || user.email}
              </p>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}

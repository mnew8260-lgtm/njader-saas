'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard, Phone, Users, KeyRound, LogOut, Shield,
  Terminal, ShieldCheck, Globe,
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
  { href: '/dashboard',        label: 'الرئيسية',    icon: <LayoutDashboard className="size-4" /> },
  { href: '/telegram-login',   label: 'إضافة حساب',   icon: <Phone className="size-4" /> },
  { href: '/accounts',         label: 'حساباتي',     icon: <Users className="size-4" /> },
  { href: '/commands',         label: 'مدير الأوامر', icon: <Terminal className="size-4" /> },
  { href: '/ban-checker',     label: 'فاحص الحظر',  icon: <ShieldCheck className="size-4" /> },
  { href: '/admin/users',     label: 'الاشتراكات',   icon: <Shield className="size-4" />, adminOnly: true },
  { href: '/admin/api-pool',  label: 'API Pool',    icon: <KeyRound className="size-4" />, adminOnly: true },
  { href: '/proxy-manager',   label: 'البروكسي',     icon: <Globe className="size-4" />, adminOnly: true },
];

export function DashboardNav({ user }: { user: AuthUser }) {
  const router = useRouter();
  const pathname = usePathname();

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const isAdmin = user.role === 'owner' || user.role === 'admin';

  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-background/80 border-b">
      <div className="container mx-auto max-w-6xl flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold grid place-items-center">N</div>
            <span className="font-bold text-lg hidden sm:inline">NJADDER</span>
          </Link>
          <nav className="flex items-center gap-1 overflow-x-auto max-w-full">
            {NAV.filter((n) => !n.adminOnly || isAdmin).map((item) => {
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
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-700 dark:text-amber-400">
              <Shield className="size-3" /> {user.role === 'owner' ? 'owner' : 'admin'}
            </span>
          )}
          <span className="text-sm text-muted-foreground hidden md:inline">
            {user.displayName || user.username || user.email}
          </span>
          <Button variant="outline" size="sm" onClick={logout} className="gap-1">
            <LogOut className="size-4" /> خروج
          </Button>
        </div>
      </div>
    </header>
  );
}

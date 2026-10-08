'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Home, Users, Terminal, FileText, Plus, ShieldCheck, Globe,
  Lock, Filter, KeyRound, Shield, LogOut, Menu, X, ChevronLeft,
  Zap, Settings, Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { AuthUser } from '@/lib/auth';

interface NavSection {
  title: string;
  items: NavItem[];
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  adminOnly?: boolean;
}

export function AppSidebar({ user }: { user: AuthUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = user.role === 'owner' || user.role === 'admin';

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const sections: NavSection[] = [
    {
      title: 'الرئيسية',
      items: [
        { href: '/dashboard',      label: 'الرئيسية',       icon: <Home className="size-4" /> },
        { href: '/telegram-login', label: 'إضافة حساب',     icon: <Plus className="size-4" /> },
        { href: '/accounts',       label: 'حساباتي',        icon: <Users className="size-4" /> },
      ],
    },
    {
      title: 'الأدوات',
      items: [
        { href: '/mass-tools',     label: 'السحب والإضافة',  icon: <Zap className="size-4" /> },
        { href: '/commands',       label: 'مدير الأوامر',   icon: <Terminal className="size-4" />, badge: '172' },
        { href: '/exports',        label: 'ملفات السحب',     icon: <FileText className="size-4" /> },
      ],
    },
    {
      title: 'الأمان',
      items: [
        { href: '/secure-login',   label: 'التسجيل الآمن',   icon: <Lock className="size-4" /> },
        { href: '/ban-checker',    label: 'فاحص الحظر',     icon: <ShieldCheck className="size-4" /> },
      ],
    },
    ...(isAdmin ? [{
      title: 'الإدارة',
      items: [
        { href: '/admin/users',    label: 'الاشتراكات',      icon: <Shield className="size-4" />, adminOnly: true },
        { href: '/admin/api-pool', label: 'API Pool',       icon: <KeyRound className="size-4" />, adminOnly: true },
        { href: '/proxy-manager',  label: 'البروكسي',       icon: <Globe className="size-4" />, adminOnly: true },
        { href: '/admin-secret',   label: 'لوحة المالك',    icon: <Settings className="size-4" />, adminOnly: true },
      ],
    }] : []),
  ];

  return (
    <>
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-50 h-14 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -mr-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground"
        >
          <Menu className="size-5" />
        </button>
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-primary text-primary-foreground font-bold grid place-items-center text-sm lowercase">n</div>
          <span className="font-bold text-sidebar-foreground lowercase">njadder</span>
        </Link>
        <div className="w-9" />
      </header>

      {/* Mobile overlay sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-sidebar overflow-y-auto animate-in slide-in-from-right duration-300">
            <SidebarContent sections={sections} pathname={pathname} user={user} onLogout={logout} onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop fixed sidebar */}
      <aside className="hidden lg:flex flex-col fixed right-0 top-0 bottom-0 w-72 bg-sidebar border-l border-sidebar-border overflow-y-auto z-40">
        <SidebarContent sections={sections} pathname={pathname} user={user} onLogout={logout} />
      </aside>
    </>
  );
}

function SidebarContent({
  sections,
  pathname,
  user,
  onLogout,
  onClose,
}: {
  sections: NavSection[];
  pathname: string;
  user: AuthUser;
  onLogout: () => void;
  onClose?: () => void;
}) {
  return (
    <div className="flex flex-col min-h-full">
      {/* Logo */}
      <div className="p-5 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
          <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold grid place-items-center text-xl lowercase shadow-lg shadow-primary/30">
            n
          </div>
          <div>
            <span className="font-bold text-lg text-sidebar-foreground lowercase block leading-none">njadder</span>
            <span className="text-[10px] text-sidebar-foreground/50 mt-0.5 block">v2.0 Professional</span>
          </div>
        </Link>
      </div>

      {/* User card */}
      <div className="p-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent/50 border border-sidebar-border/50">
          <div className="size-10 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground grid place-items-center font-bold text-sm shrink-0">
            {(user.displayName || user.username || 'U')[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{user.displayName || user.username}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {user.role === 'owner' || user.role === 'admin' ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">
                  👑 {user.role === 'owner' ? 'Owner' : 'Admin'}
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">
                  ✓ مشترك
                </span>
              )}
              {user.subscriptionPlan && (
                <span className="text-[10px] text-sidebar-foreground/50">
                  {user.subscriptionPlan === 'lifetime' ? '∞' : user.subscriptionPlan}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation sections */}
      <nav className="flex-1 px-3 pb-4 space-y-4">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 px-3 mb-1.5">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                      active
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 sidebar-active'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                    }`}
                  >
                    <span className={active ? '' : 'opacity-70'}>{item.icon}</span>
                    <span className="flex-1 font-medium">{item.label}</span>
                    {item.badge && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        active ? 'bg-primary-foreground/20' : 'bg-primary/15 text-primary'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="size-4" />
          <span className="font-medium">تسجيل الخروج</span>
        </button>
        <p className="text-[10px] text-sidebar-foreground/30 text-center mt-3">
          © 2026 njadder · @NMDDER_DEV
        </p>
      </div>
    </div>
  );
}

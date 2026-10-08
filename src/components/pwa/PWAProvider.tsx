'use client';

import { useEffect, useState, useCallback } from 'react';
import { Download, WifiOff, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store';
import { toast } from 'sonner';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type UpdateState = 'current' | 'available' | 'installing';

// Initializer functions avoid setState-in-effect lint rule
function getInitialOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

function getInitialStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

export function PWAProvider() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(getInitialStandalone);
  const [isOnline, setIsOnline] = useState<boolean>(getInitialOnline);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [updateState, setUpdateState] = useState<UpdateState>('current');
  const { language } = useStore();
  const t = language === 'ar' ? ar : en;

  // Listen for install state changes (no initial setState needed)
  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)');
    const handler = (e: MediaQueryListEvent) => setIsInstalled(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Online/offline detection (event-driven only, no initial setState in effect)
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success(t.backOnline);
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning(t.wentOffline);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [t]);

  // Register service worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          setUpdateState('installing');
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                setUpdateState('available');
              } else {
                toast.success(t.readyOffline);
              }
            }
          });
        });

        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });

        // Check for updates every 10 minutes
        setInterval(() => {
          reg.update().catch(() => {});
        }, 600000);

        console.log('[PWA] Service worker registered');
      } catch (err) {
        console.error('[PWA] SW registration failed:', err);
      }
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register);
      return () => window.removeEventListener('load', register);
    }
  }, [t]);

  // beforeinstallprompt listener
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      const dismissed = localStorage.getItem('tg-pwa-install-dismissed') === '1';
      if (!dismissed) {
        setTimeout(() => setShowInstallBanner(true), 3500);
      }
    };
    const installedHandler = () => {
      setIsInstalled(true);
      setInstallEvent(null);
      setShowInstallBanner(false);
      toast.success(t.installed);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, [t]);

  const handleInstall = useCallback(async () => {
    if (!installEvent) return;
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        toast.success(t.installed);
      } else {
        toast.info(t.installDismissed);
      }
      setInstallEvent(null);
      setShowInstallBanner(false);
    } catch (err) {
      console.error('[PWA] Install prompt failed:', err);
    }
  }, [installEvent, t]);

  const dismissBanner = useCallback(() => {
    setShowInstallBanner(false);
    localStorage.setItem('tg-pwa-install-dismissed', '1');
  }, []);

  const applyUpdate = useCallback(() => {
    if (!navigator.serviceWorker.controller) return;
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    setUpdateState('installing');
  }, []);

  return (
    <>
      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed top-16 inset-x-0 z-50 pointer-events-none">
          <div className="mx-auto max-w-md bg-amber-500/95 backdrop-blur-sm text-white text-center text-xs font-semibold py-1.5 rounded-b-lg pointer-events-auto flex items-center justify-center gap-2 shadow-lg">
            <WifiOff className="h-3.5 w-3.5" />
            {t.offlineMode}
          </div>
        </div>
      )}

      {/* Install banner */}
      {showInstallBanner && installEvent && !isInstalled && (
        <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 sm:bottom-4 z-50 max-w-sm animate-in slide-in-from-bottom-4 duration-500">
          <div className="rounded-2xl border border-primary/30 bg-card/95 backdrop-blur-xl shadow-2xl shadow-primary/20 overflow-hidden">
            <div className="flex items-start gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#229ED9] to-[#2AABEE]">
                <Download className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold leading-tight">{t.installTitle}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  {t.installBody}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Button size="sm" onClick={handleInstall} className="h-7 text-xs glow-primary">
                    <Download className="h-3 w-3 ml-1" />
                    {t.installBtn}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={dismissBanner} className="h-7 text-xs text-muted-foreground">
                    {t.laterBtn}
                  </Button>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 -mt-1 -mr-1" onClick={dismissBanner}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Update available */}
      {updateState === 'available' && (
        <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:left-4 sm:bottom-4 z-50 max-w-sm animate-in slide-in-from-bottom-4 duration-500">
          <div className="rounded-2xl border border-emerald-500/30 bg-card/95 backdrop-blur-xl shadow-2xl shadow-emerald-500/10 overflow-hidden">
            <div className="flex items-start gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
                <RefreshCw className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold leading-tight">{t.updateTitle}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  {t.updateBody}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Button size="sm" onClick={applyUpdate} className="h-7 text-xs bg-emerald-500 hover:bg-emerald-600">
                    <RefreshCw className="h-3 w-3 ml-1" />
                    {t.updateBtn}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setUpdateState('current')} className="h-7 text-xs text-muted-foreground">
                    {t.laterBtn}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Installing state */}
      {updateState === 'installing' && (
        <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:left-4 sm:bottom-4 z-50 max-w-sm">
          <div className="rounded-2xl border border-primary/30 bg-card/95 backdrop-blur-xl shadow-2xl px-4 py-3 flex items-center gap-3">
            <RefreshCw className="h-4 w-4 text-primary animate-spin" />
            <span className="text-xs font-medium">{t.installing}</span>
          </div>
        </div>
      )}
    </>
  );
}

const ar = {
  offlineMode: 'وضع عدم الاتصال — تعمل اللوحة من الذاكرة المؤقتة',
  installTitle: 'تثبيت التطبيق',
  installBody: 'ثبّت التطبيق على جهازك لاستخدامه بدون متصفح وبدون إنترنت (PWA).',
  installBtn: 'تثبيت',
  laterBtn: 'لاحقاً',
  installed: 'تم تثبيت التطبيق بنجاح!',
  installDismissed: 'ربما لاحقاً.',
  updateTitle: 'تحديث متاح',
  updateBody: 'يتوفر إصدار جديد من اللوحة. أعد التحميل للحصول على آخر التحديثات.',
  updateBtn: 'تحديث الآن',
  installing: 'جارٍ تثبيت التحديث...',
  readyOffline: 'التطبيق جاهز للعمل بدون إنترنت ✓',
  wentOffline: 'أنت الآن غير متصل — اللوحة تعمل من الذاكرة',
  backOnline: 'عاد الاتصال بالإنترنت ✓',
};

const en = {
  offlineMode: 'Offline mode — running from cache',
  installTitle: 'Install App',
  installBody: 'Install this app on your device to use it without a browser and offline (PWA).',
  installBtn: 'Install',
  laterBtn: 'Later',
  installed: 'App installed successfully!',
  installDismissed: 'Maybe later.',
  updateTitle: 'Update Available',
  updateBody: 'A new version is available. Reload to get the latest updates.',
  updateBtn: 'Update Now',
  installing: 'Installing update...',
  readyOffline: 'App is ready for offline use ✓',
  wentOffline: 'You are offline — running from cache',
  backOnline: 'Back online ✓',
};

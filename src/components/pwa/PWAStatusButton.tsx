'use client';

import { useEffect, useState, useCallback } from 'react';
import { Download, Wifi, WifiOff, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/lib/store';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

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

export function PWAStatusButton() {
  const { language } = useStore();
  const [isOnline, setIsOnline] = useState<boolean>(getInitialOnline);
  const [isInstalled, setIsInstalled] = useState<boolean>(getInitialStandalone);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const mq = window.matchMedia('(display-mode: standalone)');
    const mqHandler = (e: MediaQueryListEvent) => setIsInstalled(e.matches);
    mq.addEventListener('change', mqHandler);

    const bipHandler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const installedHandler = () => {
      setIsInstalled(true);
      setInstallEvent(null);
    };
    window.addEventListener('beforeinstallprompt', bipHandler);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      mq.removeEventListener('change', mqHandler);
      window.removeEventListener('beforeinstallprompt', bipHandler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const install = useCallback(async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') setIsInstalled(true);
    setInstallEvent(null);
  }, [installEvent]);

  if (isInstalled) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="text-emerald-400" disabled>
              <Check className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {language === 'ar' ? 'التطبيق مثبّت' : 'App installed'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (installEvent) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={install} className="text-primary">
              <Download className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {language === 'ar' ? 'تثبيت التطبيق (PWA)' : 'Install App (PWA)'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" disabled className={isOnline ? 'text-emerald-400' : 'text-amber-400'}>
            {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {isOnline
            ? (language === 'ar' ? 'متصل بالإنترنت' : 'Online')
            : (language === 'ar' ? 'غير متصل — يعمل من الذاكرة' : 'Offline — cached')}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

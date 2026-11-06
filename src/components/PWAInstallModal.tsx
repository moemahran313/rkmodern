import React, { useEffect, useState } from 'react';
import { Smartphone, WifiOff, X, CheckCircle2, Share, PlusSquare, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAAndOffline() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [swReady, setSwReady] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then(() => setSwReady(true))
        .catch(() => setSwReady(false));
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    swReady,
    isOnline,
    installApp,
  };
}

export const OfflineToast: React.FC<{ isOnline: boolean }> = ({ isOnline }) => {
  if (isOnline) return null;

  return (
    <div className="fixed top-16 left-4 right-4 z-50 mx-auto max-w-md rounded-xl bg-amber-900/95 px-4 py-2.5 text-xs font-medium text-amber-50 shadow-lg backdrop-blur-md flex items-center justify-between">
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 shrink-0 text-amber-300" />
        <span>وضع الطيران / بدون إنترنت — التطبيق يعمل بكامل مكوناته من ذاكرة هاتفك</span>
      </div>
    </div>
  );
};

export const PWAHeaderAction: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, swReady, installApp } = usePWAAndOffline();
  const [showModal, setShowModal] = useState(false);

  const handleAction = async () => {
    if (isInstallable) {
      const accepted = await installApp();
      if (!accepted) setShowModal(true);
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleAction}
        className="min-h-[38px] px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-slate-950 rounded-xl transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs"
      >
        <Smartphone className="w-3.5 h-3.5 shrink-0" />
        <span>{isInstalled ? 'التطبيق مثبت أوفلاين ✓' : 'تثبيت التطبيق أوفلاين'}</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-1 sm:hidden" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-600 dark:text-amber-400 shrink-0" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  تثبيت التطبيق على هاتفك للعمل بدون إنترنت
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Offline Cache Status */}
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <div className="font-bold text-emerald-950 dark:text-emerald-200">
                  {swReady
                    ? 'ذاكرة التطبيق الأوفلاين جاهزة ومفعّلة 100%'
                    : 'جميع بيانات المنهج محمّلة داخل التطبيق للعمل الفوري أوفلاين'}
                </div>
                <p className="text-emerald-800 dark:text-emerald-300/90 leading-relaxed">
                  كل البطاقات الذكية، مؤقت التكرار المتباعد، معمل الحفظ العلمي (Blurting & القصص)، الـ 34 سؤالاً للشيتات، والـ 6 محاضرات مدمجة بالكامل داخل التطبيق نفسه وتعمل في وضع الطيران بدون إنترنت.
                </p>
              </div>
            </div>

            {/* Direct Install Button if browser supports beforeinstallprompt */}
            {isInstallable && (
              <button
                type="button"
                onClick={async () => {
                  await installApp();
                  setShowModal(false);
                }}
                className="w-full min-h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>تثبيت التطبيق الآن بضغطة واحدة</span>
              </button>
            )}

            {/* Step-by-Step Mobile Home Screen Instructions */}
            <div className="space-y-2.5 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {isIOS
                  ? 'خطوات تثبيت التطبيق على شاشة آيفون (Safari):'
                  : 'خطوات إضافة أيقونة التطبيق على شاشة هاتفك الرئيسية:'}
              </div>

              <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 dark:bg-amber-500 text-white dark:text-slate-950 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span className="flex items-center gap-1.5">
                    اضغط على زر المشاركة <Share className="w-3.5 h-3.5 inline text-emerald-600 dark:text-amber-400" /> أو قائمة المتصفح (⋮)
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 dark:bg-amber-500 text-white dark:text-slate-950 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span className="flex items-center gap-1.5">
                    اختر <strong>«إضافة إلى الشاشة الرئيسية» (Add to Home Screen / Install App)</strong> <PlusSquare className="w-3.5 h-3.5 inline text-emerald-600 dark:text-amber-400" />
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 dark:bg-amber-500 text-white dark:text-slate-950 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <span>
                    افتح تطبيق <strong>«إدارة المخاطر»</strong> من شاشة هاتفك في أي وقت حتى مع إغلاق الواي فاي والبيانات!
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="w-full min-h-[44px] rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs sm:text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              متابعة المذاكرة المكثفة
            </button>
          </div>
        </div>
      )}
    </>
  );
};

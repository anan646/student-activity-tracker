'use client';

import { useState, useEffect } from 'react';
import { Download, X, Smartphone, CheckCircle } from 'lucide-react';
import Image from 'next/image';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showIosTip, setShowIosTip] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if already running as standalone PWA
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandaloneMode) {
      setIsStandalone(true);
      return;
    }

    // Check dismissal in sessionStorage
    if (sessionStorage.getItem('edupass_install_dismissed') === 'true') {
      setIsDismissed(true);
    }

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Capture Chrome/Android/Edge beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      if (isIos) {
        setShowIosTip(true);
      }
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('edupass_install_dismissed', 'true');
    } catch (e) {}
  };

  // If already installed as app or user dismissed, don't show
  if (isStandalone || isDismissed || (!isInstallable && !isIos)) {
    return null;
  }

  return (
    <aside aria-label="ติดตั้งแอปพลิเคชัน" className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 max-w-sm w-auto animate-in slide-in-from-bottom-5">
      <div className="bg-white/95 backdrop-blur-xl border border-purple-200/90 shadow-2xl shadow-purple-950/20 p-4 rounded-3xl flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-700 to-indigo-600 flex items-center justify-center shrink-0 overflow-hidden shadow-md shadow-purple-700/20">
          <Smartphone className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-black text-xs text-purple-950">ติดตั้งแอป EDU Pass</span>
            <span className="px-1.5 py-0.2 rounded-md bg-purple-100 text-[10px] font-extrabold text-purple-800">
              PWA
            </span>
          </div>
          <p className="text-[11px] text-purple-900/60 truncate font-medium">
            เปิดไว ใช้งานเต็มจอ ไม่ต้องเข้าเบราว์เซอร์
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3.5 py-2 bg-gradient-to-r from-purple-700 to-indigo-700 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ติดตั้ง</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition cursor-pointer text-xs"
            title="ปิด"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* iOS Tip Modal */}
      {showIosTip && (
        <div className="mt-2 p-3 bg-purple-950 text-white rounded-2xl text-[11px] font-medium leading-relaxed shadow-xl border border-purple-800 animate-in fade-in">
          <p>
            📲 <strong>วิธีติดตั้งบน iPhone/iPad:</strong> แตะปุ่มแชร์{' '}
            <span className="inline-block px-1.5 py-0.5 bg-white/20 rounded font-bold">⎋ (Share)</span>{' '}
            ด้านล่างของ Safari แล้วเลือก <strong>&quot;เพิ่มไปยังหน้าจอโฮม&quot; (Add to Home Screen)</strong>
          </p>
          <button
            type="button"
            onClick={() => setShowIosTip(false)}
            className="mt-1.5 text-purple-300 hover:text-white font-bold underline cursor-pointer"
          >
            เข้าใจแล้ว ปิดข้อความนี้
          </button>
        </div>
      )}
    </aside>
  );
}

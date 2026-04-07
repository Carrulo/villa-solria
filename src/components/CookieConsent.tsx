'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Cookie, X } from 'lucide-react';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

const STORAGE_KEY = 'villa-solria-cookie-consent';
const REOPEN_EVENT = 'villa-solria-reopen-cookies';

function getStoredPreferences(): CookiePreferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function savePreferences(prefs: CookiePreferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));

  // Dispatch event so analytics/marketing scripts can react
  window.dispatchEvent(new CustomEvent('cookie-consent-updated', { detail: prefs }));
}

export default function CookieConsent() {
  const t = useTranslations('cookies');
  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  const handleClose = useCallback(() => {
    setVisible(false);
    setShowCustomize(false);
  }, []);

  useEffect(() => {
    const existing = getStoredPreferences();
    if (!existing) {
      setVisible(true);
    }

    const handleReopen = () => {
      const current = getStoredPreferences();
      if (current) {
        setAnalytics(current.analytics);
        setMarketing(current.marketing);
      }
      setVisible(true);
    };

    window.addEventListener(REOPEN_EVENT, handleReopen);
    return () => window.removeEventListener(REOPEN_EVENT, handleReopen);
  }, []);

  const acceptAll = () => {
    savePreferences({
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString(),
    });
    handleClose();
  };

  const rejectAll = () => {
    savePreferences({
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
    });
    handleClose();
  };

  const saveCustom = () => {
    savePreferences({
      necessary: true,
      analytics,
      marketing,
      timestamp: new Date().toISOString(),
    });
    handleClose();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6 animate-slide-up">
      <div className="max-w-2xl mx-auto bg-gray-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-white/10">
        <div className="p-5 sm:p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-2.5">
              <Cookie size={20} className="text-sand shrink-0" />
              <h3 className="font-semibold text-base">{t('title')}</h3>
            </div>
            <button
              onClick={rejectAll}
              className="text-white/40 hover:text-white/70 transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <p className="text-white/60 text-sm leading-relaxed mb-5">
            {t('description')}
          </p>

          {/* Customize panel */}
          {showCustomize && (
            <div className="space-y-3 mb-5 border-t border-white/10 pt-4">
              {/* Necessary - always on */}
              <label className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">{t('necessary')}</span>
                  <p className="text-xs text-white/40 mt-0.5">{t('necessaryDesc')}</p>
                </div>
                <div className="relative">
                  <input type="checkbox" checked disabled className="sr-only peer" />
                  <div className="w-10 h-5.5 bg-sand/80 rounded-full" />
                  <div className="absolute top-0.5 left-[1.125rem] w-4.5 h-4.5 bg-white rounded-full shadow" />
                </div>
              </label>

              {/* Analytics */}
              <label className="flex items-center justify-between cursor-pointer group">
                <div>
                  <span className="text-sm font-medium">{t('analytics')}</span>
                  <p className="text-xs text-white/40 mt-0.5">{t('analyticsDesc')}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={analytics}
                  onClick={() => setAnalytics(!analytics)}
                  className={`relative w-10 h-[22px] rounded-full transition-colors ${
                    analytics ? 'bg-sand/80' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`absolute top-[2px] w-[18px] h-[18px] bg-white rounded-full shadow transition-transform ${
                      analytics ? 'translate-x-[20px]' : 'translate-x-[2px]'
                    }`}
                  />
                </button>
              </label>

              {/* Marketing */}
              <label className="flex items-center justify-between cursor-pointer group">
                <div>
                  <span className="text-sm font-medium">{t('marketing')}</span>
                  <p className="text-xs text-white/40 mt-0.5">{t('marketingDesc')}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={marketing}
                  onClick={() => setMarketing(!marketing)}
                  className={`relative w-10 h-[22px] rounded-full transition-colors ${
                    marketing ? 'bg-sand/80' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`absolute top-[2px] w-[18px] h-[18px] bg-white rounded-full shadow transition-transform ${
                      marketing ? 'translate-x-[20px]' : 'translate-x-[2px]'
                    }`}
                  />
                </button>
              </label>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            {showCustomize ? (
              <button
                onClick={saveCustom}
                className="flex-1 bg-sand hover:bg-sand-light text-gray-900 font-medium text-sm py-2.5 px-4 rounded-xl transition-colors"
              >
                {t('save')}
              </button>
            ) : (
              <>
                <button
                  onClick={acceptAll}
                  className="flex-1 bg-sand hover:bg-sand-light text-gray-900 font-medium text-sm py-2.5 px-4 rounded-xl transition-colors"
                >
                  {t('acceptAll')}
                </button>
                <button
                  onClick={rejectAll}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white font-medium text-sm py-2.5 px-4 rounded-xl transition-colors"
                >
                  {t('rejectAll')}
                </button>
                <button
                  onClick={() => setShowCustomize(true)}
                  className="flex-1 bg-transparent hover:bg-white/10 text-white/70 hover:text-white font-medium text-sm py-2.5 px-4 rounded-xl transition-colors border border-white/20"
                >
                  {t('customize')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}

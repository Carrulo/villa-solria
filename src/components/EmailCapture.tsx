'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Mail, CheckCircle } from 'lucide-react';

export default function EmailCapture({ locale }: { locale: string }) {
  const t = useTranslations('newsletter');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || status === 'loading') return;

    setStatus('loading');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale }),
      });

      if (res.ok) {
        setStatus('success');
        setEmail('');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <section className="py-16 lg:py-24">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl p-8 sm:p-10 shadow-sm border border-gray-100 text-center">
            <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} className="text-emerald-600" />
            </div>
            <p className="text-lg font-semibold text-gray-900">{t('success')}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 lg:py-24">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl p-8 sm:p-10 shadow-sm border border-gray-100 text-center">
          <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Mail size={28} className="text-primary" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{t('title')}</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">{t('desc')}</p>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('placeholder')}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent text-sm"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="px-6 py-3 bg-accent text-white font-semibold rounded-xl hover:bg-accent-hover transition-all text-sm disabled:opacity-60"
            >
              {t('submit')}
            </button>
          </form>

          <p className="text-xs text-gray-400 mt-4">{t('privacy')}</p>
        </div>
      </div>
    </section>
  );
}

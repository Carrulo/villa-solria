'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Send, CheckCircle, AlertCircle } from 'lucide-react';

export default function ContactForm() {
  const t = useTranslations('form');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('sending');

    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem('name') as HTMLInputElement).value,
      email: (form.elements.namedItem('email') as HTMLInputElement).value,
      phone: (form.elements.namedItem('phone') as HTMLInputElement).value || '',
      message: (form.elements.namedItem('message') as HTMLTextAreaElement).value,
    };

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error('Failed');
      setStatus('success');
      form.reset();
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="text-center py-8">
        <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
        <p className="text-green-700 font-medium">{t('success')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700 mb-1">
          {t('name')} *
        </label>
        <input
          id="contact-name"
          name="name"
          type="text"
          required
          placeholder={t('namePlaceholder')}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all text-sm"
        />
      </div>

      <div>
        <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700 mb-1">
          {t('email')} *
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          required
          placeholder={t('emailPlaceholder')}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all text-sm"
        />
      </div>

      <div>
        <label htmlFor="contact-phone" className="block text-sm font-medium text-gray-700 mb-1">
          {t('phone')}
        </label>
        <input
          id="contact-phone"
          name="phone"
          type="tel"
          placeholder={t('phonePlaceholder')}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all text-sm"
        />
      </div>

      <div>
        <label htmlFor="contact-message" className="block text-sm font-medium text-gray-700 mb-1">
          {t('message')} *
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={5}
          placeholder={t('messagePlaceholder')}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all text-sm resize-none"
        />
      </div>

      {status === 'error' && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle size={16} />
          <span>Something went wrong. Please try again.</span>
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white font-semibold rounded-xl hover:bg-accent-hover transition-all shadow-sm disabled:opacity-60"
      >
        {status === 'sending' ? (
          t('sending')
        ) : (
          <>
            <Send size={18} />
            {t('submit')}
          </>
        )}
      </button>
    </form>
  );
}

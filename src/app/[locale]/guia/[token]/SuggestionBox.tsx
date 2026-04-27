'use client';

import { useState } from 'react';

interface Strings {
  title: string;
  subtitle: string;
  placeholder: string;
  rating_label: string;
  send: string;
  sending: string;
  thanks: string;
  error: string;
}

export default function SuggestionBox({
  token,
  locale,
  strings,
}: {
  token: string;
  locale: string;
  strings: Strings;
}) {
  const [rating, setRating] = useState<number>(0);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function submit() {
    if (status === 'sending' || status === 'sent') return;
    if (message.trim().length < 2) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/guide/suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          message: message.trim(),
          rating: rating > 0 ? rating : undefined,
          locale,
        }),
      });
      if (!res.ok) throw new Error('send_failed');
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <section className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 sm:p-6 text-center">
        <p className="text-2xl mb-2">💚</p>
        <p className="text-sm font-medium text-emerald-900">{strings.thanks}</p>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-sm">
      <h2 className="text-lg sm:text-xl font-serif font-semibold text-stone-900 mb-1 flex items-center gap-2">
        <span className="text-2xl leading-none">💬</span> {strings.title}
      </h2>
      <p className="text-sm text-stone-600 mb-4">{strings.subtitle}</p>

      <div className="mb-3">
        <p className="text-xs uppercase tracking-widest text-stone-500 mb-1.5 font-semibold">
          {strings.rating_label}
        </p>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(rating === n ? 0 : n)}
              aria-label={`${n} stars`}
              className={`text-2xl leading-none transition-transform active:scale-90 ${
                n <= rating ? 'text-amber-400' : 'text-stone-300 hover:text-amber-200'
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        maxLength={4000}
        placeholder={strings.placeholder}
        className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 resize-none"
      />

      {status === 'error' && (
        <p className="text-xs text-red-600 mt-2">{strings.error}</p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={status === 'sending' || message.trim().length < 2}
        className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-sm font-semibold py-2.5 disabled:bg-stone-200 disabled:text-stone-400"
      >
        {status === 'sending' ? strings.sending : strings.send}
      </button>
    </section>
  );
}

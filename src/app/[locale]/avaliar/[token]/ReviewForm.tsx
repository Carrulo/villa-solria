'use client';

import { useState } from 'react';
import type { ReviewStrings } from './strings';

export default function ReviewForm({
  token,
  locale,
  defaultName,
  strings: t,
}: {
  token: string;
  locale: string;
  defaultName: string;
  strings: ReviewStrings;
}) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [name, setName] = useState(defaultName);
  const [country, setCountry] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const ready = stars > 0 && comment.trim().length >= 10;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || status === 'sending') return;
    setStatus('sending');
    try {
      const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, stars, comment: comment.trim(), name, country, locale }),
      });
      if (!res.ok) throw new Error('send_failed');
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
        <p className="text-3xl mb-2">💚</p>
        <p className="font-semibold text-emerald-900">{t.thanks_title}</p>
        <p className="text-sm text-emerald-800 mt-1">{t.thanks_body}</p>
      </div>
    );
  }

  const field =
    'w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-base text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100';

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-sm space-y-5">
      <fieldset>
        <legend className="text-sm font-medium text-stone-700 mb-2">{t.rating_label}</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setStars(n)}
              aria-label={`${n}/5`}
              aria-pressed={n <= stars}
              className={`text-4xl leading-none p-1 transition-transform active:scale-90 ${
                n <= stars ? 'text-amber-400' : 'text-stone-300 hover:text-amber-200'
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="block text-sm font-medium text-stone-700 mb-1.5">{t.comment_label}</span>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={5}
          maxLength={3000}
          placeholder={t.comment_placeholder}
          className={`${field} resize-none`}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-sm font-medium text-stone-700 mb-1.5">{t.name_label}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className={field} />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-stone-700 mb-1.5">{t.country_label}</span>
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            maxLength={60}
            placeholder={t.country_placeholder}
            className={field}
          />
        </label>
      </div>

      {status === 'error' && <p className="text-sm text-red-600">{t.error}</p>}

      <button
        type="submit"
        disabled={!ready || status === 'sending'}
        className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold py-3 disabled:bg-stone-200 disabled:text-stone-400"
      >
        {status === 'sending' ? t.sending : t.send}
      </button>
      <p className="text-xs text-stone-500 text-center">{t.note}</p>
    </form>
  );
}

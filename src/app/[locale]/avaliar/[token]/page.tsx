import { notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import { reviewWindow } from '@/lib/review-window';
import ReviewForm from './ReviewForm';
import { STRINGS, type ReviewLocale } from './strings';

export const dynamic = 'force-dynamic';

// A guest reviews the stay through the private link of their booking —
// the same guide_token as the guide — so every review on the site comes
// from someone who actually stayed. Saved hidden, approved in /admin/reviews.
export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: rawLocale, token } = await params;
  const sp = await searchParams;
  const urlLocale = (['pt', 'en', 'es', 'de'].includes(rawLocale) ? rawLocale : 'en') as ReviewLocale;
  const requestedLang = typeof sp?.lang === 'string' && sp.lang in STRINGS ? (sp.lang as ReviewLocale) : null;
  let locale: ReviewLocale = requestedLang ?? urlLocale;

  const isPreview = token === 'preview';
  if (!isPreview && (!token || token.length < 8)) notFound();

  let guestName = '';
  let state: 'before' | 'open' | 'closed' | 'published' = 'open';
  if (!isPreview) {
    const supabase = createServerClient();
    const { data: booking } = await supabase
      .from('bookings')
      .select('id, guest_name, checkout_date, language, status')
      .eq('guide_token', token)
      .maybeSingle();
    if (!booking || booking.status === 'cancelled') notFound();
    if (!requestedLang && (booking.language || '').toLowerCase() === 'fr') locale = 'fr';
    guestName = (booking.guest_name || '').trim().split(/\s+/)[0] || '';
    state = reviewWindow(booking.checkout_date, new Date().toISOString().slice(0, 10));
    if (state === 'open') {
      const { data: existing } = await supabase
        .from('reviews')
        .select('visible')
        .eq('booking_id', booking.id)
        .maybeSingle();
      if (existing?.visible) state = 'published';
    }
  }
  const t = STRINGS[locale];
  const message = state === 'before' ? t.before : state === 'closed' ? t.closed : state === 'published' ? t.already : null;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 px-5 py-10 sm:py-16">
      <div className="max-w-lg mx-auto">
        <p className="text-xs uppercase tracking-widest text-stone-500 mb-3">Villa Solria</p>
        <h1 className="text-3xl font-serif font-semibold text-stone-900">{t.title}</h1>
        <p className="text-stone-600 mt-2 mb-8">{t.intro}</p>
        {message ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-6 text-center text-sm text-stone-600">
            {message}
          </div>
        ) : (
          <ReviewForm token={token} locale={locale} defaultName={guestName} strings={t} />
        )}
      </div>
    </div>
  );
}

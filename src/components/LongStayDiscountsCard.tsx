import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { BadgePercent, ArrowRight, Check } from 'lucide-react';
import { createServerClient } from '@/lib/supabase-server';
import type { Season } from '@/lib/supabase';

type Tier = {
  nights: number;
  percent: number;
  label: string;
  midStayIncluded: boolean;
};

function pickActiveSeason(seasons: Season[]): Season | null {
  if (seasons.length === 0) return null;
  const today = new Date().toISOString().slice(0, 10);
  return (
    seasons.find((s) => today >= s.start_date && today <= s.end_date) ??
    seasons.reduce((a, b) => (a.price_per_night <= b.price_per_night ? a : b))
  );
}

export default async function LongStayDiscountsCard({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'discounts' });

  const supabase = createServerClient();
  const { data } = await supabase.from('seasons').select('*');
  const seasons = (data || []) as Season[];
  const season = pickActiveSeason(seasons);

  if (!season) return null;

  const tiers: Tier[] = [
    { nights: 7, percent: season.weekly_discount || 0, label: t('weekly'), midStayIncluded: false },
    { nights: 14, percent: season.biweekly_discount || 0, label: t('biweekly'), midStayIncluded: true },
    { nights: 28, percent: season.monthly_discount || 0, label: t('monthly'), midStayIncluded: true },
  ].filter((tier) => tier.percent > 0);

  if (tiers.length === 0) return null;

  return (
    <section className="py-8 lg:py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 rounded-full mb-3">
            <BadgePercent size={14} className="text-accent" />
            <span className="text-xs font-semibold uppercase tracking-wider text-accent">
              {t('eyebrow')}
            </span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">{t('title')}</h2>
          <p className="text-sm text-gray-500">{t('subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
          {tiers.map((tier) => {
            const savings = Math.round(season.price_per_night * tier.nights * (tier.percent / 100));
            return (
              <Link
                key={tier.nights}
                href="/pricing"
                className="group relative overflow-hidden rounded-2xl border border-gray-150 bg-white p-5 lg:p-6 hover:border-accent hover:shadow-md transition-all"
              >
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl lg:text-4xl font-bold text-accent">-{tier.percent}%</span>
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    {tier.label}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  {t('saveLabel', { amount: savings })}
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  {t('saveHint', { nights: tier.nights, price: Math.round(season.price_per_night) })}
                </p>
                {tier.midStayIncluded && (
                  <p className="text-xs text-emerald-600 inline-flex items-center gap-1 mb-3">
                    <Check size={12} /> {t('cleaningIncluded')}
                  </p>
                )}
                <span className="inline-flex items-center gap-1 text-xs font-medium text-accent group-hover:underline">
                  {t('cta')} <ArrowRight size={12} />
                </span>
              </Link>
            );
          })}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">{t('footnote')}</p>
      </div>
    </section>
  );
}

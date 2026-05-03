import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { MapPin, Umbrella, Building2, Plane, Palmtree, UtensilsCrossed, Bike, Landmark } from 'lucide-react';
import { supabase, getPhotoUrl, type Photo } from '@/lib/supabase';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return { title: t('locationTitle'), description: t('locationDescription') };
}

async function getLocationHeroUrl(): Promise<string> {
  // 1) Photo explicitly flagged as location hero
  const { data: pinned } = await supabase
    .from('photos')
    .select('*')
    .eq('is_location_hero', true)
    .eq('is_visible', true)
    .limit(1);
  if (pinned?.[0]) return getPhotoUrl(pinned[0] as Photo);
  // 2) Otherwise first visible 'view' photo
  const { data } = await supabase
    .from('photos')
    .select('*')
    .eq('is_visible', true)
    .eq('category', 'view')
    .order('sort_order', { ascending: true })
    .limit(1);
  const photo = data?.[0] as Photo | undefined;
  return photo ? getPhotoUrl(photo) : '/images/property/beach-view.jpg';
}

export default async function LocationPage() {
  const t = await getTranslations('location');
  const heroUrl = await getLocationHeroUrl();

  const distances = [
    { icon: Umbrella, name: t('distances.beach'), dist: t('distances.beachDist'), color: 'bg-accent/10 text-accent' },
    { icon: Building2, name: t('distances.tavira'), dist: t('distances.taviraDist'), color: 'bg-primary/10 text-primary' },
    { icon: Palmtree, name: t('distances.island'), dist: t('distances.islandDist'), color: 'bg-sand/20 text-sand' },
    { icon: Plane, name: t('distances.airport'), dist: t('distances.airportDist'), color: 'bg-gray-100 text-gray-600' },
  ];

  const recommendations = [
    { icon: Umbrella, key: 'beaches' },
    { icon: UtensilsCrossed, key: 'restaurants' },
    { icon: Bike, key: 'activities' },
    { icon: Landmark, key: 'culture' },
  ];

  return (
    <div>
      {/* Hero Image */}
      <div className="relative h-[35vh] lg:h-[45vh] w-full">
        <Image
          src={heroUrl}
          alt="Villa Solria area"
          fill
          priority
          className="object-cover"
          sizes="100vw"
          unoptimized={heroUrl.startsWith('http')}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <h1 className="text-3xl lg:text-4xl font-bold text-white drop-shadow-lg">{t('title')}</h1>
          <p className="text-lg text-white/80 mt-2 drop-shadow-md">{t('subtitle')}</p>
        </div>
      </div>

      <div className="py-12 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Map + Address */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          <div className="lg:col-span-2">
            <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100">
              <iframe
                src="https://maps.google.com/maps?q=37.1317,-7.6100&t=&z=17&ie=UTF8&iwloc=&output=embed"
                width="100%"
                height="400"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full"
                title="Villa Solria — Cabanas de Tavira"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start gap-3 mb-4">
                <MapPin size={20} className="text-accent shrink-0 mt-0.5" />
                <p className="text-gray-700 text-sm leading-relaxed">{t('address')}</p>
              </div>
            </div>

            <h3 className="font-semibold text-gray-900 text-lg pt-2">{t('distancesTitle')}</h3>
            {distances.map((d) => (
              <div key={d.name} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${d.color}`}>
                    <d.icon size={20} />
                  </div>
                  <span className="text-gray-700 text-sm font-medium">{d.name}</span>
                </div>
                <span className="text-primary font-bold text-sm">{d.dist}</span>
              </div>
            ))}
          </div>
        </div>

        {/* About */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-6 text-center">{t('aboutTitle')}</h2>
          <p className="text-gray-600 leading-relaxed text-lg text-center">{t('aboutText')}</p>
        </div>

        {/* Main attractions — 6 highlights for SEO + pre-booking convincers.
            Detailed insider info (specific restaurants, contacts, opening
            hours) stays in the post-booking guide. */}
        <div className="mb-16">
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2 text-center">
            {t('highlightsTitle')}
          </h2>
          <p className="text-gray-500 text-center max-w-2xl mx-auto mb-8">
            {t('highlightsSubtitle')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { key: 'iliaCabanas', emoji: '🏝️', gradient: 'from-sky-500 to-cyan-400' },
              { key: 'riaFormosa', emoji: '⛵', gradient: 'from-emerald-500 to-teal-400' },
              { key: 'taviraCentro', emoji: '🏛️', gradient: 'from-amber-500 to-orange-400' },
              { key: 'praiaBarril', emoji: '⚓', gradient: 'from-rose-500 to-pink-400' },
              { key: 'cacelaVelha', emoji: '🌅', gradient: 'from-purple-500 to-fuchsia-400' },
              { key: 'castroMarim', emoji: '🏰', gradient: 'from-yellow-500 to-amber-400' },
            ].map((h) => (
              <div
                key={h.key}
                className="group relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`h-32 bg-gradient-to-br ${h.gradient} flex items-center justify-center text-5xl group-hover:scale-110 transition-transform duration-500`}>
                  <span aria-hidden>{h.emoji}</span>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {t(`highlights.${h.key}.name`)}
                    </h3>
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {t(`highlights.${h.key}.distance`)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {t(`highlights.${h.key}.blurb`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-6 italic">
            {t('highlightsGuideHint')}
          </p>
        </div>

        {/* Recommendations */}
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-8 text-center">{t('recommendationsTitle')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {recommendations.map((rec) => (
              <div key={rec.key} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <rec.icon size={24} className="text-primary" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  {t(`recommendations.${rec.key}`)}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {t(`recommendations.${rec.key}Desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

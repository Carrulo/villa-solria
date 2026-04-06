import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import AmenityIcon from '@/components/AmenityIcon';
import {
  AirVent, Wifi, UtensilsCrossed, GlassWater, WashingMachine,
  Flame, Beef, Car, Lock, Sun, Eye, TreePine, Coffee,
  Zap, CircleDot, Slice, Baby,
  Clock, Ban, PawPrint, PartyPopper, Users, Home, ArrowUp
} from 'lucide-react';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return { title: t('villaTitle'), description: t('villaDescription') };
}

export default function VillaPage() {
  const t = useTranslations('villa');

  const amenities = [
    { icon: AirVent, key: 'ac' },
    { icon: Wifi, key: 'wifi' },
    { icon: UtensilsCrossed, key: 'kitchen' },
    { icon: GlassWater, key: 'dishwasher' },
    { icon: WashingMachine, key: 'washer' },
    { icon: Flame, key: 'fireplace' },
    { icon: Beef, key: 'bbq' },
    { icon: Car, key: 'parking' },
    { icon: Lock, key: 'smartLock' },
    { icon: Sun, key: 'terrace' },
    { icon: Eye, key: 'balcony' },
    { icon: TreePine, key: 'garden' },
    { icon: Coffee, key: 'coffeeMachine' },
    { icon: Zap, key: 'airFryer' },
    { icon: CircleDot, key: 'microwave' },
    { icon: Slice, key: 'toaster' },
    { icon: Baby, key: 'crib' },
  ];

  const rules = [
    { icon: Clock, key: 'checkIn' },
    { icon: Clock, key: 'checkOut' },
    { icon: Ban, key: 'noSmoking' },
    { icon: PawPrint, key: 'noPets' },
    { icon: PartyPopper, key: 'noParties' },
    { icon: Users, key: 'maxGuests' },
  ];

  return (
    <div className="py-12 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">{t('title')}</h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">{t('subtitle')}</p>
        </div>

        {/* Description */}
        <div className="max-w-3xl mx-auto mb-16">
          <p className="text-gray-600 leading-relaxed text-lg text-center">{t('description')}</p>
        </div>

        {/* Floor plans */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-20">
          {[
            { icon: Home, title: t('groundFloor'), desc: t('groundFloorDesc'), gradient: 'from-primary/5 to-primary/10' },
            { icon: ArrowUp, title: t('firstFloor'), desc: t('firstFloorDesc'), gradient: 'from-accent/5 to-accent/10' },
            { icon: Sun, title: t('outdoor'), desc: t('outdoorDesc'), gradient: 'from-sand/10 to-sand/20' },
          ].map((floor) => (
            <div key={floor.title} className={`bg-gradient-to-br ${floor.gradient} rounded-2xl p-8 border border-gray-100`}>
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm">
                <floor.icon size={24} className="text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{floor.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{floor.desc}</p>
            </div>
          ))}
        </div>

        {/* Amenities */}
        <div className="mb-20">
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-8 text-center">
            {t('amenitiesTitle')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {amenities.map((amenity) => (
              <AmenityIcon
                key={amenity.key}
                icon={amenity.icon}
                label={t(`amenities.${amenity.key}`)}
              />
            ))}
          </div>
        </div>

        {/* House Rules */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-8 text-center">
            {t('rulesTitle')}
          </h2>
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <div className="space-y-4">
              {rules.map((rule) => (
                <div key={rule.key} className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                    <rule.icon size={20} className="text-gray-500" />
                  </div>
                  <span className="text-gray-700">{t(`rules.${rule.key}`)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

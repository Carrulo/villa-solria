import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
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
    <div>
      {/* Hero Image */}
      <div className="relative h-[40vh] lg:h-[50vh] w-full">
        <Image
          src="/images/property/aerial-view.jpg"
          alt="Villa Solria aerial view"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <h1 className="text-3xl lg:text-4xl font-bold text-white drop-shadow-lg">{t('title')}</h1>
          <p className="text-lg text-white/80 mt-2 drop-shadow-md max-w-2xl mx-auto px-4">{t('subtitle')}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        {/* Description */}
        <div className="max-w-3xl mx-auto mb-16">
          <p className="text-gray-600 leading-relaxed text-lg text-center">{t('description')}</p>
        </div>

        {/* Floor plans with images */}
        <div className="mb-20 space-y-12">
          {/* Ground Floor */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-8 border border-gray-100">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm">
                <Home size={24} className="text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('groundFloor')}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{t('groundFloorDesc')}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                <Image
                  src="/images/property/living-room.jpg"
                  alt="Living room"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 50vw, 25vw"
                />
              </div>
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                <Image
                  src="/images/property/kitchen.jpg"
                  alt="Kitchen"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 50vw, 25vw"
                />
              </div>
            </div>
          </div>

          {/* First Floor */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="grid grid-cols-2 gap-3 lg:order-1 order-2">
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                <Image
                  src="/images/property/bedroom-master.jpg"
                  alt="Master bedroom"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 50vw, 25vw"
                />
              </div>
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                <Image
                  src="/images/property/bedroom-double.jpg"
                  alt="Double bedroom"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 50vw, 25vw"
                />
              </div>
            </div>
            <div className="bg-gradient-to-br from-accent/5 to-accent/10 rounded-2xl p-8 border border-gray-100 lg:order-2 order-1">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm">
                <ArrowUp size={24} className="text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('firstFloor')}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{t('firstFloorDesc')}</p>
            </div>
          </div>

          {/* Outdoor */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-sand/10 to-sand/20 rounded-2xl p-8 border border-gray-100">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm">
                <Sun size={24} className="text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('outdoor')}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{t('outdoorDesc')}</p>
            </div>
            <div className="relative aspect-[4/3] lg:aspect-auto rounded-xl overflow-hidden">
              <Image
                src="/images/property/garden.jpg"
                alt="Garden"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 33vw"
              />
            </div>
            <div className="relative aspect-[4/3] lg:aspect-auto rounded-xl overflow-hidden">
              <Image
                src="/images/property/balcony.jpg"
                alt="Master bedroom balcony"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 33vw"
              />
            </div>
          </div>
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

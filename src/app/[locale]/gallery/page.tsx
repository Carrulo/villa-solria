'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { X } from 'lucide-react';
import PhotoPlaceholder from '@/components/PhotoPlaceholder';

const galleryGradients = [
  'from-primary/20 to-accent/15',
  'from-sand/30 to-primary/15',
  'from-accent/15 to-sand/25',
  'from-primary/25 to-sand/15',
  'from-sand/20 to-accent/20',
  'from-accent/20 to-primary/15',
  'from-primary/15 to-sand/30',
  'from-sand/25 to-accent/15',
  'from-accent/25 to-primary/10',
  'from-primary/20 to-accent/25',
  'from-sand/15 to-primary/25',
  'from-accent/15 to-sand/20',
];

export default function GalleryPage() {
  const t = useTranslations('gallery');
  const [lightbox, setLightbox] = useState<number | null>(null);

  const photos = [
    { key: 'livingRoom', label: t('livingRoom') },
    { key: 'kitchen', label: t('kitchen') },
    { key: 'masterBedroom', label: t('masterBedroom') },
    { key: 'secondBedroom', label: t('secondBedroom') },
    { key: 'thirdBedroom', label: t('thirdBedroom') },
    { key: 'bathroom', label: t('bathroom') },
    { key: 'terrace', label: t('terrace') },
    { key: 'rooftop', label: t('rooftop') },
    { key: 'garden', label: t('garden') },
    { key: 'riaView', label: t('riaView') },
    { key: 'exterior', label: t('exterior') },
    { key: 'balcony', label: t('balcony') },
  ];

  return (
    <div className="py-12 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">{t('title')}</h1>
          <p className="text-lg text-gray-500">{t('subtitle')}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
          {photos.map((photo, i) => (
            <PhotoPlaceholder
              key={photo.key}
              label={photo.label}
              gradient={galleryGradients[i % galleryGradients.length]}
              className={`aspect-[4/3] ${i === 0 ? 'md:col-span-2 md:row-span-2 md:aspect-auto md:min-h-[300px]' : ''}`}
              onClick={() => setLightbox(i)}
            />
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-6 right-6 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <X size={24} />
          </button>
          <div
            className="max-w-4xl w-full aspect-[16/10] rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <PhotoPlaceholder
              label={photos[lightbox].label}
              gradient={galleryGradients[lightbox % galleryGradients.length]}
              className="w-full h-full text-lg"
            />
          </div>
          <p className="absolute bottom-8 text-white/70 text-sm font-medium">
            {photos[lightbox].label} ({lightbox + 1}/{photos.length})
          </p>
        </div>
      )}
    </div>
  );
}

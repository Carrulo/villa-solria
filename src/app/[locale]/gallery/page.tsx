'use client';

import { useTranslations } from 'next-intl';
import { useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';

const galleryPhotos = [
  { src: '/images/property/hero-ria-formosa.jpg', key: 'riaView', fallbackLabel: 'Vista Ria Formosa' },
  { src: '/images/property/aerial-view.jpg', key: 'aerialView', fallbackLabel: 'Vista Aerea' },
  { src: '/images/property/living-room.jpg', key: 'livingRoom', fallbackLabel: 'Sala de Estar' },
  { src: '/images/property/kitchen.jpg', key: 'kitchen', fallbackLabel: 'Cozinha' },
  { src: '/images/property/bedroom-master.jpg', key: 'masterBedroom', fallbackLabel: 'Suite Principal' },
  { src: '/images/property/bedroom-double.jpg', key: 'secondBedroom', fallbackLabel: 'Quarto Duplo' },
  { src: '/images/property/bedroom-twin.jpg', key: 'thirdBedroom', fallbackLabel: 'Quarto Twin' },
  { src: '/images/property/bathroom.jpg', key: 'bathroom', fallbackLabel: 'Casa de Banho' },
  { src: '/images/property/terrace-view.jpg', key: 'terrace', fallbackLabel: 'Terraco' },
  { src: '/images/property/rooftop.jpg', key: 'rooftop', fallbackLabel: 'Rooftop' },
  { src: '/images/property/garden.jpg', key: 'garden', fallbackLabel: 'Jardim' },
  { src: '/images/property/exterior.jpg', key: 'exterior', fallbackLabel: 'Exterior' },
  { src: '/images/property/balcony.jpg', key: 'balcony', fallbackLabel: 'Varanda' },
  { src: '/images/property/dining-area.jpg', key: 'diningArea', fallbackLabel: 'Zona de Refeicoes' },
  { src: '/images/property/sunset-view.jpg', key: 'sunsetView', fallbackLabel: 'Por do Sol' },
  { src: '/images/property/beach-view.jpg', key: 'beachView', fallbackLabel: 'Vista Praia' },
  { src: '/images/property/entrance.jpg', key: 'entrance', fallbackLabel: 'Entrada' },
];

export default function GalleryPage() {
  const t = useTranslations('gallery');
  const [lightbox, setLightbox] = useState<number | null>(null);

  const getLabel = (photo: typeof galleryPhotos[number]) => {
    try {
      return t(photo.key);
    } catch {
      return photo.fallbackLabel;
    }
  };

  const goNext = useCallback(() => {
    setLightbox((prev) => (prev !== null ? (prev + 1) % galleryPhotos.length : null));
  }, []);

  const goPrev = useCallback(() => {
    setLightbox((prev) => (prev !== null ? (prev - 1 + galleryPhotos.length) % galleryPhotos.length : null));
  }, []);

  return (
    <div className="py-12 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">{t('title')}</h1>
          <p className="text-lg text-gray-500">{t('subtitle')}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
          {galleryPhotos.map((photo, i) => (
            <div
              key={photo.key}
              className={`relative overflow-hidden rounded-2xl cursor-pointer group ${
                i === 0 ? 'md:col-span-2 md:row-span-2 md:aspect-auto md:min-h-[300px] aspect-[4/3]' : 'aspect-[4/3]'
              }`}
              onClick={() => setLightbox(i)}
            >
              <Image
                src={photo.src}
                alt={getLabel(photo)}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes={i === 0 ? '(max-width: 768px) 100vw, 50vw' : '(max-width: 768px) 50vw, 25vw'}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="absolute bottom-3 left-3 text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg">
                {getLabel(photo)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-6 right-6 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
          >
            <X size={24} />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
          >
            <ChevronLeft size={28} />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
          >
            <ChevronRight size={28} />
          </button>

          <div
            className="relative max-w-5xl w-full aspect-[16/10] rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={galleryPhotos[lightbox].src}
              alt={getLabel(galleryPhotos[lightbox])}
              fill
              className="object-contain"
              sizes="90vw"
              priority
            />
          </div>
          <p className="absolute bottom-8 text-white/70 text-sm font-medium">
            {getLabel(galleryPhotos[lightbox])} ({lightbox + 1}/{galleryPhotos.length})
          </p>
        </div>
      )}
    </div>
  );
}

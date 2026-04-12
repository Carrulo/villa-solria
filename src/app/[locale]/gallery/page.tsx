'use client';

import { useTranslations } from 'next-intl';
import { useState, useCallback, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import type { Photo, PhotoCategory } from '@/lib/supabase';
import { getPhotoUrl, PHOTO_CATEGORIES } from '@/lib/supabase';

const fallbackPhotos: { src: string; key: string; fallbackLabel: string; category: PhotoCategory }[] = [
  { src: '/images/property/hero-ria-formosa.jpg', key: 'riaView', fallbackLabel: 'Vista Ria Formosa', category: 'view' },
  { src: '/images/property/aerial-view.jpg', key: 'aerialView', fallbackLabel: 'Vista Aerea', category: 'view' },
  { src: '/images/property/living-room.jpg', key: 'livingRoom', fallbackLabel: 'Sala de Estar', category: 'living' },
  { src: '/images/property/kitchen.jpg', key: 'kitchen', fallbackLabel: 'Cozinha', category: 'kitchen' },
  { src: '/images/property/bedroom-master.jpg', key: 'masterBedroom', fallbackLabel: 'Suite Principal', category: 'bedroom' },
  { src: '/images/property/bedroom-double.jpg', key: 'secondBedroom', fallbackLabel: 'Quarto Duplo', category: 'bedroom' },
  { src: '/images/property/bedroom-twin.jpg', key: 'thirdBedroom', fallbackLabel: 'Quarto Twin', category: 'bedroom' },
  { src: '/images/property/bathroom.jpg', key: 'bathroom', fallbackLabel: 'Casa de Banho', category: 'bathroom' },
  { src: '/images/property/terrace-view.jpg', key: 'terrace', fallbackLabel: 'Terraco', category: 'outdoor' },
  { src: '/images/property/rooftop.jpg', key: 'rooftop', fallbackLabel: 'Rooftop', category: 'outdoor' },
  { src: '/images/property/garden.jpg', key: 'garden', fallbackLabel: 'Jardim', category: 'outdoor' },
  { src: '/images/property/exterior.jpg', key: 'exterior', fallbackLabel: 'Exterior', category: 'outdoor' },
  { src: '/images/property/balcony.jpg', key: 'balcony', fallbackLabel: 'Varanda', category: 'outdoor' },
  { src: '/images/property/dining-area.jpg', key: 'diningArea', fallbackLabel: 'Zona de Refeicoes', category: 'living' },
  { src: '/images/property/sunset-view.jpg', key: 'sunsetView', fallbackLabel: 'Por do Sol', category: 'view' },
  { src: '/images/property/beach-view.jpg', key: 'beachView', fallbackLabel: 'Vista Praia', category: 'view' },
  { src: '/images/property/entrance.jpg', key: 'entrance', fallbackLabel: 'Entrada', category: 'outdoor' },
];

const FILTER_CATEGORIES = ['all', 'bedroom', 'living', 'outdoor', 'view'] as const;
type FilterCategory = typeof FILTER_CATEGORIES[number];

export default function GalleryPage() {
  const t = useTranslations('gallery');
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [galleryPhotos, setGalleryPhotos] = useState(
    fallbackPhotos.map((p) => ({ src: p.src, label: p.fallbackLabel, key: p.key, category: p.category as string }))
  );

  useEffect(() => {
    fetch('/api/photos')
      .then((r) => r.json())
      .then((data: Photo[]) => {
        if (data && data.length > 0) {
          setGalleryPhotos(
            data.map((p) => ({
              src: getPhotoUrl(p),
              label: p.alt_text || p.filename,
              key: p.id,
              category: p.category,
            }))
          );
        }
      })
      .catch(() => {
        // Keep fallback photos
      });
  }, []);

  const filteredPhotos = activeFilter === 'all'
    ? galleryPhotos
    : galleryPhotos.filter((p) => p.category === activeFilter);

  const getLabel = (photo: { label: string; key: string }) => {
    // Try translation by key, fall back to label from DB/fallback
    try {
      return t(photo.key);
    } catch {
      return photo.label;
    }
  };

  const goNext = useCallback(() => {
    setLightbox((prev) => (prev !== null ? (prev + 1) % filteredPhotos.length : null));
  }, [filteredPhotos.length]);

  const goPrev = useCallback(() => {
    setLightbox((prev) => (prev !== null ? (prev - 1 + filteredPhotos.length) % filteredPhotos.length : null));
  }, [filteredPhotos.length]);

  return (
    <div className="py-12 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">{t('title')}</h1>
          <p className="text-lg text-gray-500">{t('subtitle')}</p>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {FILTER_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => { setActiveFilter(cat); setLightbox(null); }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeFilter === cat
                  ? 'bg-accent text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t(`filter_${cat}`)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
          {filteredPhotos.map((photo, i) => (
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
                unoptimized={photo.src.startsWith('http')}
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
              src={filteredPhotos[lightbox].src}
              alt={getLabel(filteredPhotos[lightbox])}
              fill
              className="object-contain"
              sizes="90vw"
              priority
              unoptimized={filteredPhotos[lightbox].src.startsWith('http')}
            />
          </div>
          <p className="absolute bottom-8 text-white/70 text-sm font-medium">
            {getLabel(filteredPhotos[lightbox])} ({lightbox + 1}/{filteredPhotos.length})
          </p>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

type Photo = { src: string; alt: string };

type Props = {
  photos: Photo[];
  /** "feature" = first photo spans 2x2 on desktop (matches home grid). "even" = uniform. */
  variant?: 'feature' | 'even';
};

/**
 * Client-side photo grid with:
 *  - Fade + slide-up reveal as cards enter the viewport (IntersectionObserver)
 *  - Subtle hover zoom
 *  - Full-screen lightbox on click with arrow-key + click navigation
 *
 * Replaces the previous static <Image /> grids on the home page so
 * users can actually click to view photos full-size.
 */
export default function ScrollGallery({ photos, variant = 'feature' }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reveal animation — toggle .visible on each card as it enters viewport.
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (!('IntersectionObserver' in window)) {
      cards.forEach((c) => c.classList.add('visible'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
    );
    cards.forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [photos]);

  const close = useCallback(() => setActive(null), []);
  const next = useCallback(
    () => setActive((i) => (i === null ? null : (i + 1) % photos.length)),
    [photos.length],
  );
  const prev = useCallback(
    () =>
      setActive((i) =>
        i === null ? null : (i - 1 + photos.length) % photos.length,
      ),
    [photos.length],
  );

  // Keyboard nav + body scroll lock while lightbox is open.
  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [active, close, next, prev]);

  return (
    <>
      <div
        ref={containerRef}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4"
      >
        {photos.map((p, i) => {
          const featured = variant === 'feature' && i === 0;
          return (
            <button
              key={p.src + i}
              type="button"
              data-reveal
              onClick={() => setActive(i)}
              style={{ transitionDelay: `${Math.min(i * 60, 360)}ms` }}
              className={`group relative overflow-hidden rounded-2xl cursor-zoom-in opacity-0 translate-y-6 [&.visible]:opacity-100 [&.visible]:translate-y-0 transition-[opacity,transform] duration-700 ease-out ${
                featured
                  ? 'lg:col-span-2 lg:row-span-2 aspect-[4/3] lg:aspect-auto'
                  : 'aspect-[4/3]'
              }`}
            >
              <Image
                src={p.src}
                alt={p.alt}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
                sizes={
                  featured
                    ? '(max-width: 1024px) 100vw, 50vw'
                    : '(max-width: 1024px) 50vw, 25vw'
                }
                unoptimized={p.src.startsWith('http')}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
          );
        })}
      </div>

      {active !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={close}
        >
          <button
            onClick={close}
            aria-label="Close"
            className="absolute top-5 right-5 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-10"
          >
            <X size={22} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            aria-label="Previous"
            className="absolute left-3 lg:left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-10"
          >
            <ChevronLeft size={28} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            aria-label="Next"
            className="absolute right-3 lg:right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-10"
          >
            <ChevronRight size={28} />
          </button>
          <div
            className="relative w-full h-full max-w-6xl max-h-[88vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[active].src}
              alt={photos[active].alt}
              className="max-w-full max-h-full object-contain rounded-xl"
            />
          </div>
          <p className="absolute bottom-6 left-0 right-0 text-center text-white/70 text-sm font-medium">
            {photos[active].alt} · {active + 1}/{photos.length}
          </p>
        </div>
      )}
    </>
  );
}

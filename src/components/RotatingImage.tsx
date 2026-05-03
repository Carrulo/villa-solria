'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

type Props = {
  urls: string[];
  alt: string;
  sizes?: string;
  intervalMs?: number;
  className?: string;
};

/**
 * Cross-fading auto-rotating image. Cycles through `urls` every
 * `intervalMs`. Pauses while the tab is hidden so we don't waste cycles
 * (or burn through hover-pre-fetch). Falls back to a static <Image /> if
 * there's only one url.
 */
export default function RotatingImage({
  urls,
  alt,
  sizes,
  intervalMs = 4500,
  className = 'object-cover',
}: Props) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (urls.length < 2) return;
    let timer: ReturnType<typeof setInterval>;
    const start = () => {
      timer = setInterval(() => {
        if (document.visibilityState === 'visible') {
          setIdx((i) => (i + 1) % urls.length);
        }
      }, intervalMs);
    };
    start();
    return () => clearInterval(timer);
  }, [urls, intervalMs]);

  if (urls.length === 0) return null;
  if (urls.length === 1) {
    return (
      <Image
        src={urls[0]}
        alt={alt}
        fill
        className={className}
        sizes={sizes}
        unoptimized={urls[0].startsWith('http')}
      />
    );
  }

  return (
    <>
      {urls.map((url, i) => (
        <Image
          key={url}
          src={url}
          alt={alt}
          fill
          sizes={sizes}
          unoptimized={url.startsWith('http')}
          className={`${className} transition-opacity duration-1000 ${
            i === idx ? 'opacity-100' : 'opacity-0'
          }`}
          priority={i === 0}
        />
      ))}
    </>
  );
}

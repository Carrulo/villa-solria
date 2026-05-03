'use client';

import { useScroll, useTransform, motion } from 'framer-motion';
import { useRef } from 'react';
import RotatingImage from './RotatingImage';

type Props = {
  urls: string[];
  alt: string;
  intervalMs?: number;
};

/**
 * Hero with vertical parallax: as the user scrolls past the hero, the
 * image translates upward at ~50% scroll speed and fades slightly.
 * Makes the page feel more cinematic without breaking layout.
 */
export default function ParallaxHero({ urls, alt, intervalMs = 7000 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '25%']);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.55]);

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      <motion.div style={{ y, scale, opacity }} className="absolute inset-0">
        <RotatingImage urls={urls} alt={alt} sizes="100vw" intervalMs={intervalMs} />
      </motion.div>
    </div>
  );
}

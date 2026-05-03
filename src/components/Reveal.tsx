'use client';

import { motion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';

type Direction = 'up' | 'down' | 'left' | 'right' | 'scale' | 'blur';

type Props = {
  children: ReactNode;
  direction?: Direction;
  delay?: number;
  /** Distance in px the element travels in. Defaults to 28. */
  distance?: number;
  /** % of element that must be visible before triggering. */
  amount?: number;
  className?: string;
  /** Stagger children animations when wrapping a list. */
  stagger?: boolean;
  staggerDelay?: number;
};

const buildVariants = (direction: Direction, distance: number): Variants => {
  const base = { opacity: 0 };
  const target = { opacity: 1, x: 0, y: 0, scale: 1, filter: 'blur(0px)' };
  switch (direction) {
    case 'up':
      return { hidden: { ...base, y: distance }, visible: target };
    case 'down':
      return { hidden: { ...base, y: -distance }, visible: target };
    case 'left':
      return { hidden: { ...base, x: distance }, visible: target };
    case 'right':
      return { hidden: { ...base, x: -distance }, visible: target };
    case 'scale':
      return { hidden: { ...base, scale: 0.9 }, visible: target };
    case 'blur':
      return { hidden: { ...base, filter: 'blur(12px)' }, visible: target };
  }
};

/**
 * One-shot scroll-triggered reveal. Wrap any block to fade-in with a
 * direction (up/down/left/right/scale/blur). Triggers once when 25% of
 * the element enters the viewport, respects prefers-reduced-motion via
 * Framer Motion's reducedMotion: 'user' default at the MotionConfig
 * level (handled by browser/system).
 */
export default function Reveal({
  children,
  direction = 'up',
  delay = 0,
  distance = 28,
  amount = 0.25,
  className,
  stagger = false,
  staggerDelay = 0.08,
}: Props) {
  const variants = buildVariants(direction, distance);

  if (stagger) {
    const containerVariants: Variants = {
      hidden: {},
      visible: { transition: { staggerChildren: staggerDelay, delayChildren: delay } },
    };
    return (
      <motion.div
        className={className}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount }}
        variants={containerVariants}
      >
        {Array.isArray(children)
          ? children.map((child, i) => (
              <motion.div key={i} variants={variants} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
                {child}
              </motion.div>
            ))
          : (
            <motion.div variants={variants} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
              {children}
            </motion.div>
          )}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      variants={variants}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

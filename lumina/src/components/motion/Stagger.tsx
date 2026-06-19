'use client';

import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';

export interface StaggerProps extends HTMLMotionProps<'div'> {
  /** Delay between each child's entrance, in seconds. */
  stagger?: number;
  /** Delay before the first child animates, in seconds. */
  delayChildren?: number;
}

/**
 * Container that orchestrates a staggered entrance for `StaggerItem` children.
 * Respects `prefers-reduced-motion` (children appear immediately, no stagger).
 */
export function Stagger({
  stagger = 0.08,
  delayChildren = 0,
  children,
  ...rest
}: StaggerProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: reducedMotion
            ? {}
            : { staggerChildren: stagger, delayChildren },
        },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export interface StaggerItemProps extends HTMLMotionProps<'div'> {
  /** Initial vertical offset in px. */
  y?: number;
}

/** A single item within a `Stagger` container. */
export function StaggerItem({ y = 12, children, ...rest }: StaggerItemProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      variants={{
        hidden: reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y },
        show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

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
 * Respects `prefers-reduced-motion`: when reduced motion is preferred, renders
 * a plain non-animated element so children appear immediately with no variant
 * orchestration (matching the pattern used by FadeIn and Reveal).
 */
export function Stagger({
  stagger = 0.08,
  delayChildren = 0,
  children,
  ...rest
}: StaggerProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <motion.div {...rest}>{children}</motion.div>;
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: { staggerChildren: stagger, delayChildren },
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

  if (reducedMotion) {
    return <motion.div {...rest}>{children}</motion.div>;
  }

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y },
        show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

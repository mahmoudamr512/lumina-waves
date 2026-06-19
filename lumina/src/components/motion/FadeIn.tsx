'use client';

import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';

export interface FadeInProps extends HTMLMotionProps<'div'> {
  /** Seconds before the animation starts. */
  delay?: number;
  /** Animation duration in seconds. */
  duration?: number;
  /** Initial vertical offset in px (translated to 0 on enter). */
  y?: number;
}

/**
 * Fades + slides its children in on mount. Respects `prefers-reduced-motion`:
 * when reduced motion is requested it renders fully visible with no transition.
 */
export function FadeIn({
  delay = 0,
  duration = 0.6,
  y = 12,
  children,
  ...rest
}: FadeInProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <motion.div {...rest}>{children}</motion.div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: 'easeOut' }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

'use client';

import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion';

export interface RevealProps extends HTMLMotionProps<'div'> {
  /** Animation duration in seconds. */
  duration?: number;
  /** Initial vertical offset in px. */
  y?: number;
  /** Re-run the reveal every time the section re-enters the viewport. */
  repeat?: boolean;
}

/**
 * Reveals a section when it scrolls into view. Respects
 * `prefers-reduced-motion` (renders visible immediately, no transition).
 */
export function Reveal({
  duration = 0.6,
  y = 24,
  repeat = false,
  children,
  ...rest
}: RevealProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <motion.div {...rest}>{children}</motion.div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: !repeat, amount: 0.3 }}
      transition={{ duration, ease: 'easeOut' }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

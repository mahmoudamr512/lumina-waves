'use client';

import { LuminaWaveMark } from './LuminaWaveMark';
import { LuminaWordmark } from './LuminaWordmark';
import type { BrandCommonProps } from './types';
import { cn } from '@/lib/cn';

export type LuminaLogoLayout = 'stacked' | 'horizontal' | 'mark';

export interface LuminaLogoProps extends BrandCommonProps {
  /**
   * - `stacked` (default): mark above the wordmark, matching the official art.
   * - `horizontal`: mark beside the wordmark (e.g. app top bar).
   * - `mark`: the circular mark only.
   */
  layout?: LuminaLogoLayout;
  /** Pixel size of the mark. Number → px, string passed through. Default 96. */
  size?: number | string;
  /** Forwarded to the mark; the bars pulse (respects reduced motion). */
  animated?: boolean;
  /** Accessible label for the whole logo. */
  title?: string;
}

/**
 * The full Lumina Waves lockup composing the circular mark and the wordmark.
 * RTL-safe (centred / flex layouts make no directional assumptions beyond the
 * logical `horizontal` row, which mirrors correctly under `dir="rtl"`).
 */
export function LuminaLogo({
  className,
  layout = 'stacked',
  size = 96,
  variant = 'gold',
  animated = false,
  title = 'Lumina Waves',
}: LuminaLogoProps) {
  if (layout === 'mark') {
    return (
      <LuminaWaveMark
        className={className}
        size={size}
        variant={variant}
        animated={animated}
        title={title}
      />
    );
  }

  // The wordmark is sized in `em`; derive its base font-size from the mark size
  // so the lockup scales as a unit. Falls back gracefully for string sizes.
  // Clamp to a minimum of 6px so that LUMINA (at 2.4em) is always ≥ 14.4px —
  // preventing sub-legible wordmark text when the mark is used at small sizes
  // (e.g. top-bar usage at size={36}: 36×0.13 = 4.7px raw → clamped to 6px
  //  → LUMINA renders at 2.4×6 = 14.4px).
  const numericSize = typeof size === 'number' ? size : undefined;
  const wordmarkStyle =
    numericSize !== undefined
      ? { fontSize: Math.max(numericSize * 0.13, 6) }
      : undefined;

  if (layout === 'horizontal') {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <LuminaWaveMark size={size} variant={variant} animated={animated} title={title} />
        <div style={wordmarkStyle}>
          <LuminaWordmark variant={variant} />
        </div>
      </div>
    );
  }

  // stacked
  return (
    <div className={cn('flex flex-col items-center gap-5', className)}>
      <LuminaWaveMark size={size} variant={variant} animated={animated} title={title} />
      <div style={wordmarkStyle}>
        <LuminaWordmark variant={variant} />
      </div>
    </div>
  );
}

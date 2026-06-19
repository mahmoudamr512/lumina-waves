'use client';

import { LuminaWaveMark } from './LuminaWaveMark';
import { LuminaWordmark } from './LuminaWordmark';
import type { BrandCommonProps } from './types';

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
  const numericSize = typeof size === 'number' ? size : undefined;
  const wordmarkStyle =
    numericSize !== undefined ? { fontSize: numericSize * 0.13 } : undefined;

  if (layout === 'horizontal') {
    return (
      <div className={`flex items-center gap-3 ${className ?? ''}`}>
        <LuminaWaveMark size={size} variant={variant} animated={animated} title={title} />
        <div style={wordmarkStyle}>
          <LuminaWordmark variant={variant} />
        </div>
      </div>
    );
  }

  // stacked
  return (
    <div className={`flex flex-col items-center gap-5 ${className ?? ''}`}>
      <LuminaWaveMark size={size} variant={variant} animated={animated} title={title} />
      <div style={wordmarkStyle}>
        <LuminaWordmark variant={variant} />
      </div>
    </div>
  );
}

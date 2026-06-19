/** Shared prop contract for all brand/logo components. */
export type BrandVariant = 'gold' | 'mono' | 'currentColor';

export interface BrandCommonProps {
  /** Extra classes merged onto the root SVG element. */
  className?: string;
  /**
   * Fill treatment:
   * - `gold` (default): the metallic gold linear gradient.
   * - `mono`: solid gold-400 (`#D4AF37`), no gradient emitted.
   * - `currentColor`: inherits the CSS `color` (e.g. on a gold button).
   */
  variant?: BrandVariant;
}

/** Primary metallic gold (gold-400) used for the `mono` variant. */
export const GOLD_400 = '#D4AF37';

/** Stops for the reusable metallic gold gradient (135deg in CSS / SVG x1y1→x2y2). */
export const GOLD_GRADIENT_STOPS = [
  { offset: '0%', color: '#8A6A2F' },
  { offset: '35%', color: '#E6C878' },
  { offset: '50%', color: '#FBF3D9' },
  { offset: '70%', color: '#D4AF37' },
  { offset: '100%', color: '#8A6A2F' },
] as const;

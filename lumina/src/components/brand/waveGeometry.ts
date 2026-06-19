/**
 * Deterministic geometry for the Lumina Waves circular soundwave mark.
 *
 * The mark is a symmetric audio waveform: vertical rounded-cap bars, tallest in
 * the centre, tapering down symmetrically to the left and right, ending in a few
 * tiny dots at the extremes. Everything is derived from this single source so the
 * React component (`LuminaWaveMark`) and the standalone SVG asset stay in sync.
 *
 * The mark is purely centred/symmetric — there are no left/right semantic
 * differences — which makes it RTL-safe.
 */

/** SVG viewBox is a square; the design grid is VIEWBOX x VIEWBOX user units. */
export const VIEWBOX = 100;
const CENTER = VIEWBOX / 2;

/** Number of bars. Odd so there is a single tallest centre bar. */
export const BAR_COUNT = 33;

/** Outer gold ring geometry (within the viewBox). */
export const RING_RADIUS = 46;
export const RING_STROKE = 2;

/** Horizontal extent the bars occupy, as a fraction of the ring diameter. */
const FIELD_WIDTH = 66;
/** Tallest bar height (centre) and the floor height for the end dots. */
const MAX_BAR_HEIGHT = 46;
const MIN_BAR_HEIGHT = 3;
const BAR_WIDTH = 1.7;

export interface WaveBar {
  /** Bar index, 0-based, left → right. */
  readonly index: number;
  /** Centre x of the bar in viewBox units. */
  readonly x: number;
  /** Full bar height in viewBox units (rounded). */
  readonly height: number;
  /** Top y (the bar is vertically centred on the baseline). */
  readonly y: number;
  /** Normalised height 0..1 relative to MAX_BAR_HEIGHT — used for animation amplitude. */
  readonly amplitude: number;
}

/**
 * The symmetric height envelope, computed once.
 *
 * Profile: a raised-cosine "hump" (cos over [-π/2, π/2]) raised to a power so the
 * centre stays tall while the shoulders fall away quickly, blended with a small
 * floor so the extreme bars become the little end dots. This yields a smooth,
 * organic equalizer silhouette rather than a triangle.
 *
 * The resulting 33-value profile (heights in viewBox units) is exported as
 * `BAR_HEIGHTS` for documentation/testing; it is generated, never hand-typed.
 */
function computeBars(): readonly WaveBar[] {
  const bars: WaveBar[] = [];
  const last = BAR_COUNT - 1;
  const step = BAR_COUNT > 1 ? FIELD_WIDTH / last : 0;
  const startX = CENTER - FIELD_WIDTH / 2;

  for (let i = 0; i < BAR_COUNT; i++) {
    // t in [-1, 1], 0 at centre.
    const t = last === 0 ? 0 : (i - last / 2) / (last / 2);
    // Raised-cosine envelope in [0, 1], 1 at centre.
    const cosEnv = Math.cos((t * Math.PI) / 2);
    const env = Math.pow(Math.max(0, cosEnv), 1.7);
    const height = Math.round(MIN_BAR_HEIGHT + env * (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT));
    bars.push({
      index: i,
      x: Number((startX + i * step).toFixed(2)),
      height,
      y: Number((CENTER - height / 2).toFixed(2)),
      amplitude: Number((height / MAX_BAR_HEIGHT).toFixed(3)),
    });
  }
  return bars;
}

export const WAVE_BARS: readonly WaveBar[] = computeBars();

/** The pure symmetric height profile (viewBox units), left → right. */
export const BAR_HEIGHTS: readonly number[] = WAVE_BARS.map((b) => b.height);

export const BAR_GEOMETRY = {
  center: CENTER,
  barWidth: BAR_WIDTH,
  ringRadius: RING_RADIUS,
  ringStroke: RING_STROKE,
} as const;

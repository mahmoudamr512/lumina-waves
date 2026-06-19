// Standalone copy of the wave geometry for build-time SVG generation (Node ESM,
// no TS/bundler). Kept numerically identical to src/components/brand/waveGeometry.ts.
// A unit test asserts the two profiles match so they cannot silently drift.

export const VIEWBOX = 100;
const CENTER = VIEWBOX / 2;
export const BAR_COUNT = 33;
export const RING_RADIUS = 46;
export const RING_STROKE = 2;
const FIELD_WIDTH = 66;
const MAX_BAR_HEIGHT = 46;
const MIN_BAR_HEIGHT = 3;
export const BAR_WIDTH = 1.7;

function computeBars() {
  const bars = [];
  const last = BAR_COUNT - 1;
  const step = BAR_COUNT > 1 ? FIELD_WIDTH / last : 0;
  const startX = CENTER - FIELD_WIDTH / 2;
  for (let i = 0; i < BAR_COUNT; i++) {
    const t = last === 0 ? 0 : (i - last / 2) / (last / 2);
    const cosEnv = Math.cos((t * Math.PI) / 2);
    const env = Math.pow(Math.max(0, cosEnv), 1.7);
    const height = Math.round(MIN_BAR_HEIGHT + env * (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT));
    bars.push({
      index: i,
      x: Number((startX + i * step).toFixed(2)),
      height,
      y: Number((CENTER - height / 2).toFixed(2)),
    });
  }
  return bars;
}

export const WAVE_BARS = computeBars();
export const CENTER_XY = CENTER;

const GOLD_GRADIENT_STOPS = [
  { offset: '0%', color: '#8A6A2F' },
  { offset: '35%', color: '#E6C878' },
  { offset: '50%', color: '#FBF3D9' },
  { offset: '70%', color: '#D4AF37' },
  { offset: '100%', color: '#8A6A2F' },
];

/** Build the self-contained mark SVG markup. `gid` namespaces the gradient ids. */
export function markSvg({ gid = 'lw' } = {}) {
  const bars = WAVE_BARS.map(
    (b) =>
      `<rect x="${(b.x - BAR_WIDTH / 2).toFixed(2)}" y="${b.y}" width="${BAR_WIDTH}" height="${b.height}" rx="${(BAR_WIDTH / 2).toFixed(2)}"/>`,
  ).join('');
  const stops = GOLD_GRADIENT_STOPS.map(
    (s) => `<stop offset="${s.offset}" stop-color="${s.color}"/>`,
  ).join('');
  const glowStops =
    '<stop offset="0%" stop-color="#D4AF37" stop-opacity="0"/>' +
    '<stop offset="50%" stop-color="#FBF3D9" stop-opacity="0.7"/>' +
    '<stop offset="100%" stop-color="#D4AF37" stop-opacity="0"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX} ${VIEWBOX}" fill="none" role="img" aria-label="Lumina Waves">
  <defs>
    <linearGradient id="${gid}-grad" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient>
    <linearGradient id="${gid}-glow" x1="0" y1="0.5" x2="1" y2="0.5">${glowStops}</linearGradient>
  </defs>
  <circle cx="${CENTER}" cy="${CENTER}" r="${RING_RADIUS}" stroke="url(#${gid}-grad)" stroke-width="${RING_STROKE}"/>
  <rect x="${CENTER - RING_RADIUS + 6}" y="${CENTER - 0.5}" width="${(RING_RADIUS - 6) * 2}" height="1" fill="url(#${gid}-glow)"/>
  <g fill="url(#${gid}-grad)">${bars}</g>
</svg>`;
}

/** The wordmark as standalone SVG <text> (for emails/PDF where Cinzel CSS isn't available). */
export function wordmarkSvg({ gid = 'lww' } = {}) {
  const stops = GOLD_GRADIENT_STOPS.map(
    (s) => `<stop offset="${s.offset}" stop-color="${s.color}"/>`,
  ).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 110" fill="none" role="img" aria-label="Lumina Waves Productions">
  <defs><linearGradient id="${gid}-grad" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient></defs>
  <text x="150" y="42" text-anchor="middle" fill="url(#${gid}-grad)" font-family="'Cinzel', Georgia, serif" font-size="36" font-weight="600" letter-spacing="8">LUMINA</text>
  <line x1="92" y1="66" x2="116" y2="66" stroke="url(#${gid}-grad)" stroke-width="1"/>
  <text x="150" y="71" text-anchor="middle" fill="url(#${gid}-grad)" font-family="'Cinzel', Georgia, serif" font-size="16" font-weight="500" letter-spacing="9">WAVES</text>
  <line x1="184" y1="66" x2="208" y2="66" stroke="url(#${gid}-grad)" stroke-width="1"/>
  <text x="150" y="92" text-anchor="middle" fill="url(#${gid}-grad)" font-family="'Cinzel', Georgia, serif" font-size="9" font-weight="400" letter-spacing="9">PRODUCTIONS</text>
</svg>`;
}

/** Full stacked lockup (mark above wordmark) as standalone SVG. */
export function fullSvg({ gid = 'lwf' } = {}) {
  const stops = GOLD_GRADIENT_STOPS.map(
    (s) => `<stop offset="${s.offset}" stop-color="${s.color}"/>`,
  ).join('');
  const glowStops =
    '<stop offset="0%" stop-color="#D4AF37" stop-opacity="0"/>' +
    '<stop offset="50%" stop-color="#FBF3D9" stop-opacity="0.7"/>' +
    '<stop offset="100%" stop-color="#D4AF37" stop-opacity="0"/>';
  const bars = WAVE_BARS.map(
    (b) =>
      `<rect x="${(b.x - BAR_WIDTH / 2).toFixed(2)}" y="${b.y}" width="${BAR_WIDTH}" height="${b.height}" rx="${(BAR_WIDTH / 2).toFixed(2)}"/>`,
  ).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 260" fill="none" role="img" aria-label="Lumina Waves Productions">
  <defs>
    <linearGradient id="${gid}-grad" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient>
    <linearGradient id="${gid}-glow" x1="0" y1="0.5" x2="1" y2="0.5">${glowStops}</linearGradient>
  </defs>
  <g transform="translate(100 0)">
    <circle cx="${CENTER}" cy="${CENTER}" r="${RING_RADIUS}" stroke="url(#${gid}-grad)" stroke-width="${RING_STROKE}"/>
    <rect x="${CENTER - RING_RADIUS + 6}" y="${CENTER - 0.5}" width="${(RING_RADIUS - 6) * 2}" height="1" fill="url(#${gid}-glow)"/>
    <g fill="url(#${gid}-grad)">${bars}</g>
  </g>
  <text x="150" y="155" text-anchor="middle" fill="url(#${gid}-grad)" font-family="'Cinzel', Georgia, serif" font-size="36" font-weight="600" letter-spacing="8">LUMINA</text>
  <line x1="92" y1="179" x2="116" y2="179" stroke="url(#${gid}-grad)" stroke-width="1"/>
  <text x="150" y="184" text-anchor="middle" fill="url(#${gid}-grad)" font-family="'Cinzel', Georgia, serif" font-size="16" font-weight="500" letter-spacing="9">WAVES</text>
  <line x1="184" y1="179" x2="208" y2="179" stroke="url(#${gid}-grad)" stroke-width="1"/>
  <text x="150" y="205" text-anchor="middle" fill="url(#${gid}-grad)" font-family="'Cinzel', Georgia, serif" font-size="9" font-weight="400" letter-spacing="9">PRODUCTIONS</text>
</svg>`;
}

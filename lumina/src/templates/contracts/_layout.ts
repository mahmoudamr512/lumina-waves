import fs from 'node:fs'
import path from 'node:path'

/**
 * Escapes the five characters that are unsafe in HTML text/attribute contexts.
 * Apply to every caller-supplied string before interpolating into HTML.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Cached base64-encoded woff2 so we only read the file once per process.
let _fontB64: string | null = null

function getAmiriFontB64(): string {
  if (_fontB64) return _fontB64
  const fontPath = path.join(
    path.dirname(require.resolve('@fontsource/amiri/package.json')),
    'files',
    'amiri-arabic-400-normal.woff2',
  )
  _fontB64 = fs.readFileSync(fontPath).toString('base64')
  return _fontB64
}

export function layout({
  titleAr,
  bodyHtml,
  letterhead = '',
  footer = '',
  extraCss = '',
}: {
  titleAr: string
  bodyHtml: string
  /** Optional letterhead HTML rendered above the title (e.g. gold logo + company name). */
  letterhead?: string
  /** Optional footer HTML rendered at the bottom of the document. */
  footer?: string
  /** Optional extra CSS appended to the document styles (e.g. branding styles). */
  extraCss?: string
}): string {
  const fontB64 = getAmiriFontB64()
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<style>
  @font-face {
    font-family: 'Amiri';
    font-style: normal;
    font-weight: 400;
    src: url(data:font/woff2;base64,${fontB64}) format('woff2');
  }
  body { font-family: 'Amiri', serif; line-height: 2; font-size: 14px; color: #1a1a1a; }
  h1 { text-align: center; font-size: 22px; margin: 12px 0 18px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #333; padding: 6px; text-align: center; }
  ${extraCss}
</style>
</head><body>${letterhead}<h1>${titleAr}</h1>${bodyHtml}${footer}</body></html>`
}

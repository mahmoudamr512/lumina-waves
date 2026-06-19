// Generates the registrable official-seal assets from the brand seal:
//   public/brand/stamp.svg       — gold metallic seal (font embedded, self-contained)
//   public/brand/stamp.png       — gold seal, transparent, high-res
//   public/brand/stamp-ink.svg   — single-ink seal (for a physical/registered rubber stamp)
//   public/brand/stamp-ink.png   — single-ink seal, transparent, high-res
//
// PNGs are rasterized with Chromium (Playwright) — NOT sharp/librsvg — because
// the seal uses SVG <textPath> for the curved company names, which librsvg
// does not render. Run: npm run stamp
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { chromium } from 'playwright'
import { stampSvg } from '../src/templates/contracts/branding.ts'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const brandDir = path.join(__dirname, '..', 'public', 'brand')

// Embed the Amiri Arabic font so the seal's Arabic renders anywhere (standalone).
const fontPath = path.join(
  path.dirname(require.resolve('@fontsource/amiri/package.json')),
  'files',
  'amiri-arabic-400-normal.woff2',
)
const fontB64 = fs.readFileSync(fontPath).toString('base64')
const fontStyle = `<style>@font-face{font-family:'Amiri';font-weight:400;src:url(data:font/woff2;base64,${fontB64}) format('woff2');}</style>`

// Inject the @font-face <style> right after the opening <svg ...> tag.
const withFont = (svg) => svg.replace(/(<svg[^>]*>)/, `$1\n  ${fontStyle}`)

const variants = [
  // Primary registrable seal: blue ink (the official/legal stamp).
  { name: 'stamp', svg: withFont(stampSvg({ size: 1024, variant: 'ink' })) },
  // Brand/digital alternative: gold metallic.
  { name: 'stamp-gold', svg: withFont(stampSvg({ size: 1024, variant: 'gold' })) },
]

fs.mkdirSync(brandDir, { recursive: true })
const browser = await chromium.launch()
try {
  for (const { name, svg } of variants) {
    fs.writeFileSync(path.join(brandDir, `${name}.svg`), svg)
    const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } })
    // Transparent background; the SVG fills the viewport.
    await page.setContent(
      `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:transparent}</style></head><body>${svg}</body></html>`,
      { waitUntil: 'networkidle' },
    )
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: path.join(brandDir, `${name}.png`), omitBackground: true })
    await page.close()
    console.log(`wrote ${name}.svg + ${name}.png`)
  }
} finally {
  await browser.close()
}

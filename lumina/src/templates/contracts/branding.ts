// Branding elements for generated contract PDFs: gold letterhead, official
// company seal/stamp (derived from the Lumina Waves mark), and the signature
// block. All values that flow in from callers are HTML-escaped by the caller.
import { escapeHtml } from './_layout'

/** Company identity used across generated documents (Lumina Waves = الطرف الثاني). */
export const COMPANY = {
  nameAr: 'لومينا ويفز للإنتاج الموسيقي',
  nameEn: 'LUMINA WAVES PRODUCTIONS',
  taglineAr: 'الطرف الثاني',
  // Legal description of Party 2 used in the contract preamble/intro.
  legalDescAr:
    'شركة لومينا ويفز للإنتاج الموسيقي، شركة مؤسسة طبقًا للقوانين المعمول بها، ويمثلها في التوقيع على هذا العقد ممثلها القانوني',
  email: 'notices@luminawaves.com',
  addressAr: 'القاهرة، جمهورية مصر العربية',
  // Placeholder commercial-registration line; replace with the real CR/Tax id.
  regLabelAr: 'سجل تجاري',
} as const

// Symmetric raised-cosine wave profile (heights 0..1) for the seal emblem —
// mirrors the brand LuminaWaveMark, peaking smoothly at the centre.
const SEAL_BARS = Array.from({ length: 25 }, (_, i) => {
  const t = (i - 12) / 12 // -1 … 1
  return 0.14 + 0.86 * Math.pow(Math.cos((t * Math.PI) / 2), 1.5)
})

function sealWaveMark(cx: number, cy: number, scale = 1, fill = 'url(#sealGold)'): string {
  const gap = 3.4 * scale
  const barW = 1.9 * scale
  const maxH = 40 * scale
  const n = SEAL_BARS.length
  const totalW = (n - 1) * gap
  const startX = cx - totalW / 2
  const bars = SEAL_BARS.map((h, i) => {
    const x = startX + i * gap
    const bh = Math.max(h * maxH, 2.5)
    return `<rect x="${(x - barW / 2).toFixed(2)}" y="${(cy - bh / 2).toFixed(2)}" width="${barW.toFixed(2)}" height="${bh.toFixed(2)}" rx="${(barW / 2).toFixed(2)}" fill="${fill}"/>`
  }).join('')
  // Signature horizontal baseline running through the wave (with tapered ends).
  const lineW = totalW + 14 * scale
  const baseline = `<rect x="${(cx - lineW / 2).toFixed(2)}" y="${(cy - 0.7 * scale).toFixed(2)}" width="${lineW.toFixed(2)}" height="${(1.4 * scale).toFixed(2)}" rx="${(0.7 * scale).toFixed(2)}" fill="${fill}" opacity="0.9"/>`
  return baseline + bars
}

// Ring of evenly-spaced beads (the classic embossed-seal detail).
function beadRing(cx: number, cy: number, r: number, count: number, dot: number, fill: string): string {
  let out = ''
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2
    const x = cx + r * Math.cos(a)
    const y = cy + r * Math.sin(a)
    out += `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${dot}" fill="${fill}"/>`
  }
  return out
}

// A small six-pointed star ornament centred at (x,y).
function ornamentStar(x: number, y: number, R: number, fill: string): string {
  const pts: string[] = []
  for (let i = 0; i < 12; i++) {
    const rr = i % 2 === 0 ? R : R * 0.42
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2
    pts.push(`${(x + rr * Math.cos(a)).toFixed(2)},${(y + rr * Math.sin(a)).toFixed(2)}`)
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}"/>`
}

/**
 * Official circular company seal/stamp, derived from the Lumina Waves mark.
 * Bilingual: English company name curved across the top, Arabic across the
 * bottom, the wave mark + "OFFICIAL SEAL / ختم رسمي" in the centre, and an
 * optional registration number. Self-contained SVG (uses the Amiri font that
 * the contract layout embeds, falling back to serif for Latin).
 *
 * @param regNo    registration / authentication number printed in the centre.
 * @param size     pixel size of the square seal.
 * @param variant  'gold' = metallic brand seal (digital docs); 'ink' = single
 *                 solid colour, for a physical/registered rubber stamp.
 * @param inkColor solid colour used when variant is 'ink'.
 */
export function stampSvg({
  regNo = '',
  size = 220,
  variant = 'gold',
  inkColor = '#1B3FA0',
}: { regNo?: string; size?: number; variant?: 'gold' | 'ink'; inkColor?: string } = {}): string {
  const reg = escapeHtml(regNo)
  const paint = variant === 'ink' ? inkColor : 'url(#sealGold)'
  const C = 220 // centre in the 440 viewBox
  // Ring hierarchy.
  const rOuter = 213
  const rBold = 205
  const rBoldInner = 168
  const rInner = 160
  const rBead = 150
  const rEmblem = 110
  // Curved-text radius (sits in the band between the bold ring and inner ring).
  const rText = 186
  // Top arc: left → right over the top (upright Latin text).
  const topArc = `M ${C - rText} ${C} A ${rText} ${rText} 0 0 1 ${C + rText} ${C}`
  // Bottom arc: right → left across the bottom (upright Arabic, RTL-friendly).
  const rTextBot = 180
  const botArc = `M ${C + rTextBot} ${C} A ${rTextBot} ${rTextBot} 0 0 1 ${C - rTextBot} ${C}`

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 440 440" role="img" aria-label="${escapeHtml(COMPANY.nameEn)} official seal">
  <defs>
    <linearGradient id="sealGold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#8A6A2F"/>
      <stop offset="0.35" stop-color="#E6C878"/>
      <stop offset="0.5" stop-color="#F7EBC2"/>
      <stop offset="0.7" stop-color="#D4AF37"/>
      <stop offset="1" stop-color="#8A6A2F"/>
    </linearGradient>
  </defs>
  <circle cx="${C}" cy="${C}" r="${rOuter}" fill="none" stroke="${paint}" stroke-width="1.5"/>
  <circle cx="${C}" cy="${C}" r="${rBold}" fill="none" stroke="${paint}" stroke-width="4"/>
  <circle cx="${C}" cy="${C}" r="${rBoldInner}" fill="none" stroke="${paint}" stroke-width="1.5"/>
  <circle cx="${C}" cy="${C}" r="${rInner}" fill="none" stroke="${paint}" stroke-width="0.9"/>
  ${beadRing(C, C, rBead, 76, 1.7, paint)}
  <circle cx="${C}" cy="${C}" r="${rEmblem}" fill="none" stroke="${paint}" stroke-width="1"/>
  <path id="seal-top" d="${topArc}" fill="none"/>
  <path id="seal-bot" d="${botArc}" fill="none"/>
  <text fill="${paint}" font-family="Georgia, 'Times New Roman', serif" font-size="23" font-weight="700" letter-spacing="4">
    <textPath href="#seal-top" startOffset="50%" text-anchor="middle">${escapeHtml(COMPANY.nameEn)}</textPath>
  </text>
  <text fill="${paint}" font-family="Amiri, serif" font-size="26" font-weight="700">
    <textPath href="#seal-bot" startOffset="50%" text-anchor="middle">${escapeHtml(COMPANY.nameAr)}</textPath>
  </text>
  ${ornamentStar(C - rText + 2, C, 8, paint)}
  ${ornamentStar(C + rText - 2, C, 8, paint)}
  ${sealWaveMark(C, C - 40, 1.05, paint)}
  <line x1="${C - 46}" y1="${C - 4}" x2="${C + 46}" y2="${C - 4}" stroke="${paint}" stroke-width="0.8" opacity="0.7"/>
  <text x="${C}" y="${C + 22}" text-anchor="middle" fill="${paint}" font-family="Amiri, serif" font-size="23" font-weight="700">ختم رسمي</text>
  <text x="${C}" y="${C + 44}" text-anchor="middle" fill="${paint}" font-family="Georgia, serif" font-size="11.5" font-weight="600" letter-spacing="3">OFFICIAL SEAL</text>
  ${reg
    ? `<text x="${C}" y="${C + 66}" text-anchor="middle" fill="${paint}" font-family="Georgia, serif" font-size="10.5" letter-spacing="0.5">${COMPANY.regLabelAr}: ${reg}</text>`
    : `<text x="${C}" y="${C + 66}" text-anchor="middle" fill="${paint}" font-family="Georgia, serif" font-size="10.5" letter-spacing="2">EST. 2024</text>`}
</svg>`
}

/** Gold letterhead: the Lumina mark + wordmark + company line, for the top of a contract. */
export function letterheadHtml(): string {
  const mark = sealWaveMark(60, 34, 1.0)
  return `<div class="lw-letterhead">
  <svg width="120" height="68" viewBox="0 0 120 68" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="lhGold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#8A6A2F"/><stop offset="0.4" stop-color="#E6C878"/>
        <stop offset="0.55" stop-color="#F7EBC2"/><stop offset="0.75" stop-color="#D4AF37"/><stop offset="1" stop-color="#8A6A2F"/>
      </linearGradient>
      <linearGradient id="sealGold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#8A6A2F"/><stop offset="0.4" stop-color="#E6C878"/>
        <stop offset="0.55" stop-color="#F7EBC2"/><stop offset="0.75" stop-color="#D4AF37"/><stop offset="1" stop-color="#8A6A2F"/>
      </linearGradient>
      <circle id="lhring" />
    </defs>
    <circle cx="60" cy="34" r="30" fill="none" stroke="url(#lhGold)" stroke-width="1.5"/>
    ${mark}
  </svg>
  <div class="lw-letterhead-text">
    <div class="lw-name-en">${escapeHtml(COMPANY.nameEn)}</div>
    <div class="lw-name-ar">${escapeHtml(COMPANY.nameAr)}</div>
  </div>
</div>`
}

/**
 * Signature block: Party 1 (artist) and Party 2 (Lumina Waves) signature lines,
 * with the official seal stamped over Party 2.
 */
export function signatureBlockHtml({ party1Label, regNo }: { party1Label: string; regNo?: string }): string {
  return `<div class="lw-signatures">
  <div class="lw-sig">
    <div class="lw-sig-role">الطرف الأول</div>
    <div class="lw-sig-name">${escapeHtml(party1Label)}</div>
    <div class="lw-sig-line">التوقيع</div>
  </div>
  <div class="lw-sig lw-sig-party2">
    <div class="lw-sig-role">الطرف الثاني</div>
    <div class="lw-sig-name">${escapeHtml(COMPANY.nameAr)}</div>
    <div class="lw-sig-line">التوقيع والختم</div>
    <div class="lw-stamp">${stampSvg({ regNo, size: 150, variant: 'ink' })}</div>
  </div>
</div>`
}

/** CSS for the letterhead / signatures / stamp / legal clauses, injected into the layout. */
export const BRANDING_CSS = `
  .lw-intro { margin: 6px 0 14px; }
  .lw-intro strong, .lw-clause-body strong { color: #0f0f0f; }
  .lw-clause { margin: 0 0 12px; page-break-inside: avoid; }
  .lw-clause-title { font-size: 15px; font-weight: 700; color: #8A6A2F; margin: 14px 0 4px; border-bottom: 1px solid #E3D6AE; padding-bottom: 3px; }
  .lw-clause-body { text-align: justify; line-height: 1.9; }
  .lw-clause-body p { margin: 4px 0; }
  .lw-coverage { margin: 4px 28px; }
  .lw-coverage li { margin: 2px 0; }
  .lw-letterhead { display: flex; align-items: center; justify-content: center; gap: 14px; border-bottom: 2px solid #C9A24B; padding-bottom: 12px; margin-bottom: 8px; }
  .lw-letterhead-text { text-align: center; }
  .lw-name-en { font-family: Georgia, serif; letter-spacing: 4px; font-size: 20px; font-weight: 700; color: #8A6A2F; }
  .lw-name-ar { font-family: 'Amiri', serif; font-size: 18px; color: #8A6A2F; margin-top: 2px; }
  .lw-signatures { display: flex; justify-content: space-between; gap: 40px; margin-top: 48px; }
  .lw-sig { flex: 1; text-align: center; position: relative; }
  .lw-sig-role { font-weight: 700; margin-bottom: 36px; }
  .lw-sig-name { font-size: 13px; }
  .lw-sig-line { border-top: 1px solid #333; margin-top: 8px; padding-top: 4px; font-size: 12px; color: #555; }
  .lw-sig-party2 .lw-stamp { position: absolute; inset-inline-end: 6px; top: -6px; opacity: 0.92; transform: rotate(-8deg); }
  .lw-footer { margin-top: 28px; border-top: 1px solid #C9A24B; padding-top: 8px; text-align: center; font-size: 10px; color: #777; }
`

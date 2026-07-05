// src/lib/rights.ts
export const GRANT_TYPES = {
  SALE:         { ar: 'بيع وتنازل', en: 'Sale & assignment' },
  DISTRIBUTION: { ar: 'توزيع',      en: 'Distribution' },
} as const

/**
 * Coverage modes: which exploitation-scope paragraph the granting clause of the
 * PDF renders. Backed by the `CoverageMode` enum in prisma/schema.prisma.
 *
 * - RBT_ONLY: cellular/SMS/VAS/RBT/Download-Track-Full (phone-side services).
 * - DIGITAL_ONLY: internet + streaming platforms (YouTube/Instagram/TikTok/
 *   Anghami/Spotify/Facebook/…) + broadcast/radio/TV/satellite/transportation.
 * - RBT_AND_DIGITAL: the combined default (everything above).
 *
 * The admin can also list free-text `exclusions` (e.g. «Spotify», «TikTok») —
 * the template appends them as «باستثناء …» and removes them from the clause.
 */
export const COVERAGE_MODES = {
  RBT_ONLY:        { ar: 'نغمة الانتظار فقط',                en: 'RBT only' },
  DIGITAL_ONLY:    { ar: 'القنوات الرقمية فقط',              en: 'Digital channels only' },
  RBT_AND_DIGITAL: { ar: 'نغمة الانتظار والقنوات الرقمية',   en: 'RBT + digital channels' },
} as const
export type CoverageMode = keyof typeof COVERAGE_MODES
export const COVERAGE_MODE_KEYS = Object.keys(COVERAGE_MODES) as CoverageMode[]

export const MORAL_RIGHTS_NOTE = {
  ar: 'تظل الحقوق الأدبية (حق النسبة وحق سلامة المصنف) ملكًا دائمًا للمؤلف ولا يجوز التنازل عنها.',
  en: 'Moral rights (attribution and integrity) remain perpetually with the author and can never be assigned.',
} as const

// Plan-mandated territory whitelist — exported so callers can validate/enumerate without
// hitting an undocumented runtime throw.
export const TERRITORIES = ['EGYPT','WORLDWIDE'] as const
export type Territory = typeof TERRITORIES[number]

export type GrantInput = {
  grantType: keyof typeof GRANT_TYPES
  territory: string
  coverageMode: CoverageMode
  /** Free-text list of things to exclude (e.g. platform names). */
  coverageExclusions?: string[]
}
export function validateGrant(g: GrantInput) {
  if (!GRANT_TYPES[g.grantType]) throw new Error('invalid grant type')
  if (!(TERRITORIES as readonly string[]).includes(g.territory)) throw new Error('invalid territory')
  if (!COVERAGE_MODES[g.coverageMode]) throw new Error('invalid coverage mode')
}

// src/lib/rights.ts
export const GRANT_TYPES = {
  FULL_ASSIGNMENT:       { ar: 'تنازل كامل عن الحقوق المالية', en: 'Full economic-rights buyout' },
  EXCLUSIVE_LICENSE:     { ar: 'ترخيص حصري',                   en: 'Exclusive license' },
  NON_EXCLUSIVE_LICENSE: { ar: 'ترخيص غير حصري',               en: 'Non-exclusive license' },
  MANAGEMENT:            { ar: 'عقد إدارة',                     en: 'Management only' },
} as const

export const COVERAGE = {
  DIGITAL:       { ar: 'التوزيع الرقمي والبث التدفقي', en: 'Digital / streaming' },
  BROADCAST:     { ar: 'البث الإذاعي والتلفزيوني',     en: 'Broadcast' },
  PUBLIC_PERF:   { ar: 'الأداء العلني',                en: 'Public performance' },
  SYNC:          { ar: 'المزامنة',                     en: 'Synchronization' },
  RBT:           { ar: 'نغمة الانتظار',                en: 'RBT / ringback tone' },
  MECHANICAL:    { ar: 'الحقوق الميكانيكية',           en: 'Mechanical' },
  NAME_IMAGE:    { ar: 'الاسم والصورة',                en: 'Name & image' },
} as const

export const MORAL_RIGHTS_NOTE = {
  ar: 'تظل الحقوق الأدبية (حق النسبة وحق سلامة المصنف) ملكًا دائمًا للمؤلف ولا يجوز التنازل عنها.',
  en: 'Moral rights (attribution and integrity) remain perpetually with the author and can never be assigned.',
} as const

export type GrantInput = { grantType: keyof typeof GRANT_TYPES; territory: string; coverage: string[] }
export function validateGrant(g: GrantInput) {
  if (!GRANT_TYPES[g.grantType]) throw new Error('invalid grant type')
  if (!['EGYPT','MENA','WORLDWIDE'].includes(g.territory)) throw new Error('invalid territory')
  if (!g.coverage?.length) throw new Error('coverage must list at least one right (Article 149)')
  for (const k of g.coverage) if (!(k in COVERAGE)) throw new Error(`unknown coverage: ${k}`)
}

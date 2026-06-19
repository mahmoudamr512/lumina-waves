// src/lib/arabic.ts
const DIACRITICS = /[ً-ٟـؐ-ؚۖ-ۜ۟-۪ۨ-ۭ]/g // harakat, tatweel, and Arabic mark ranges
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩'
export function normalizeArabic(input: string): string {
  return input
    .replace(DIACRITICS, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/\s+/g, ' ')
    .trim()
}

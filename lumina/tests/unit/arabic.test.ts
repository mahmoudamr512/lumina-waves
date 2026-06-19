// tests/unit/arabic.test.ts
import { normalizeArabic } from '@/lib/arabic'
test('unifies alef and strips diacritics', () => {
  expect(normalizeArabic('أَحْمَد')).toBe('احمد')
  expect(normalizeArabic('إسلام')).toBe('اسلام')
})
test('unifies taa marbuta and yaa, strips tatweel', () => {
  expect(normalizeArabic('مأســـاة')).toBe('ماساه')
  expect(normalizeArabic('مصطفى')).toBe('مصطفي')
})
test('folds arabic-indic digits', () => {
  expect(normalizeArabic('٢٠٢٦')).toBe('2026')
})
test('folds waw with hamza (ؤ→و) and yaa with hamza (ئ→ي)', () => {
  // ؤ (U+0624) → و and ئ (U+0626) → ي
  expect(normalizeArabic('مؤسسة')).toBe('موسسه')   // ؤ→و, ة→ه
  expect(normalizeArabic('هيئة')).toBe('هييه')      // ئ→ي, ة→ه
})

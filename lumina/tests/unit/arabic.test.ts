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

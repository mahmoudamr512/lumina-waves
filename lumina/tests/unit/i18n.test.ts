import { dirFor } from '@/i18n'
test('arabic is rtl, english is ltr', () => {
  expect(dirFor('ar')).toBe('rtl')
  expect(dirFor('en')).toBe('ltr')
})

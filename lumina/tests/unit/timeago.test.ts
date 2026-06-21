import { timeAgoAr } from '@/lib/labels'

const base = new Date('2026-06-21T12:00:00Z')

test('relative Arabic time renders the expected phrases', () => {
  expect(timeAgoAr(new Date('2026-06-21T11:59:50Z'), base)).toBe('الآن')
  expect(timeAgoAr(new Date('2026-06-21T11:55:00Z'), base)).toBe('منذ ٥ دقائق')
  expect(timeAgoAr(new Date('2026-06-21T09:00:00Z'), base)).toBe('منذ ٣ ساعات')
  expect(timeAgoAr(new Date('2026-06-19T12:00:00Z'), base)).toBe('منذ يومين')
})

test('singular and dual forms', () => {
  expect(timeAgoAr(new Date('2026-06-21T11:59:00Z'), base)).toBe('منذ دقيقة')
  expect(timeAgoAr(new Date('2026-06-21T11:58:00Z'), base)).toBe('منذ دقيقتين')
  expect(timeAgoAr(new Date('2026-06-21T11:00:00Z'), base)).toBe('منذ ساعة')
})

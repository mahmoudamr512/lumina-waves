// tests/unit/works-import.test.ts
import * as XLSX from 'xlsx'
import { parseWorksSpreadsheet } from '@/lib/works-import'

function xlsx(aoa: unknown[][]): Buffer {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'Sheet1')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

test('first row is always the header, verbatim', () => {
  const r = parseWorksSpreadsheet(xlsx([['Artist', 'Song', 'Year'], ['Amr', 'Tamally', 2000]]))
  expect(r.headers).toEqual(['Artist', 'Song', 'Year'])
  expect(r.raw).toEqual([['Amr', 'Tamally', '2000']])
  expect(r.rows).toEqual([{ performer: 'Amr', title: 'Tamally' }])
})

test('blank inner header cells are kept for column alignment', () => {
  const r = parseWorksSpreadsheet(xlsx([['المطرب', '', 'الملحن'], ['a', 'b', 'c']]))
  expect(r.headers).toEqual(['المطرب', '', 'الملحن'])
})

test('junk buffer yields no data rows', () => {
  const r = parseWorksSpreadsheet(Buffer.from([0, 1, 2]))
  expect(r.rows).toEqual([])
  expect(r.raw).toEqual([])
})

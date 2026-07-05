import * as XLSX from 'xlsx'

export type ImportedWork = { performer: string; title: string }

/**
 * Parse a spreadsheet buffer (.xlsx or .csv) into a list of imported works.
 * Column convention (matching the 2022 Ahmad Arafa contract): the sheet has
 * two columns — Col A = performer name (اسم المؤدّي / اسم المنشد), Col B =
 * work title (اسم المصنّف / اسم الدعاء). A header row is auto-detected and
 * skipped when the first row contains the words «اسم» or «name».
 *
 * Never throws — bad data returns []. Rows with an empty title are dropped
 * (they can't be rendered in the PDF's Article 3 consideration table).
 */
export function parseWorksSpreadsheet(buf: Buffer): ImportedWork[] {
  let wb: XLSX.WorkBook
  try {
    wb = XLSX.read(buf, { type: 'buffer' })
  } catch {
    return []
  }
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return []
  const sheet = wb.Sheets[sheetName]
  // Use array of arrays so column order is preserved regardless of headers.
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: '' })
  if (!rows.length) return []

  // Auto-skip a header row if present.
  const first = rows[0]?.map((c) => String(c ?? '').trim()) ?? []
  const looksLikeHeader =
    first.some((c) => /اسم|name/i.test(c)) && !/[0-9]{5}/.test(first.join(''))
  const dataRows = looksLikeHeader ? rows.slice(1) : rows

  const out: ImportedWork[] = []
  for (const row of dataRows) {
    const performer = String(row[0] ?? '').trim()
    const title = String(row[1] ?? '').trim()
    if (!title) continue
    out.push({ performer, title })
  }
  return out
}

import * as XLSX from 'xlsx'

export type ImportedWork = { performer: string; title: string }
export type ParsedWorksSheet = {
  /** Column headers taken from the file's first row (used as-is in the PDF).
   * Empty array = no header row detected (defaults will be used by the template). */
  headers: string[]
  rows: ImportedWork[]
}

/**
 * Parse a spreadsheet buffer (.xlsx or .csv) into a list of imported works +
 * the header row so callers can preserve the user's exact column names in the
 * generated PDF. Column convention: Col A = performer, Col B = title. A header
 * row is auto-detected when the first row contains the words «اسم» or «name».
 *
 * Never throws — bad data returns {headers: [], rows: []}. Rows with an empty
 * title are dropped (they can't be rendered in the PDF's works table).
 */
export function parseWorksSpreadsheet(buf: Buffer): ParsedWorksSheet {
  let wb: XLSX.WorkBook
  try {
    wb = XLSX.read(buf, { type: 'buffer' })
  } catch {
    return { headers: [], rows: [] }
  }
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return { headers: [], rows: [] }
  const sheet = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: '' })
  if (!rows.length) return { headers: [], rows: [] }

  const first = rows[0]?.map((c) => String(c ?? '').trim()) ?? []
  const looksLikeHeader =
    first.some((c) => /اسم|name/i.test(c)) && !/[0-9]{5}/.test(first.join(''))
  const headers = looksLikeHeader ? first.filter(Boolean) : []
  const dataRows = looksLikeHeader ? rows.slice(1) : rows

  const out: ImportedWork[] = []
  for (const row of dataRows) {
    const performer = String(row[0] ?? '').trim()
    const title = String(row[1] ?? '').trim()
    if (!title) continue
    out.push({ performer, title })
  }
  return { headers, rows: out }
}

import * as XLSX from 'xlsx'

export type ImportedWork = { performer: string; title: string }
export type ParsedWorksSheet = {
  /** Column headers taken from the file's first row (used as-is in the PDF).
   * Empty array = no header row detected (defaults will be used by the template). */
  headers: string[]
  /** Derived performer/title pairs (col 0 = performer, col 1 = title) used to
   * create Work records with a PERFORMER credit. Rows without a title are dropped. */
  rows: ImportedWork[]
  /** All columns, verbatim, for every data row (header row excluded). Used to
   * render the WHOLE Excel grid in the PDF, not just the derived 2 columns. */
  raw: string[][]
}

/**
 * Parse a spreadsheet buffer (.xlsx or .csv) into a list of imported works +
 * the header row + the raw grid so callers can preserve the user's exact column
 * names AND all columns in the generated PDF. A header row is auto-detected
 * when the first row contains the words «اسم» or «name».
 *
 * Never throws — bad data returns {headers: [], rows: [], raw: []}. Rows with
 * an empty title are dropped from `rows` (but kept in `raw` if they have data
 * in other columns).
 */
export function parseWorksSpreadsheet(buf: Buffer): ParsedWorksSheet {
  let wb: XLSX.WorkBook
  try {
    wb = XLSX.read(buf, { type: 'buffer' })
  } catch {
    return { headers: [], rows: [], raw: [] }
  }
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return { headers: [], rows: [], raw: [] }
  const sheet = wb.Sheets[sheetName]
  const gridRaw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: '' })
  if (!gridRaw.length) return { headers: [], rows: [], raw: [] }

  // Coerce every cell to a trimmed string so JSON storage + HTML rendering are safe.
  const grid: string[][] = gridRaw.map((row) => row.map((c) => String(c ?? '').trim()))
  const first = grid[0] ?? []
  const looksLikeHeader =
    first.some((c) => /اسم|name/i.test(c)) && !/[0-9]{5}/.test(first.join(''))
  const headers = looksLikeHeader ? first.filter(Boolean) : []
  const raw = looksLikeHeader ? grid.slice(1) : grid
  // Drop rows that are entirely empty (e.g. blank separator lines).
  const rawTrimmed = raw.filter((row) => row.some((c) => c.length > 0))

  const rows: ImportedWork[] = []
  for (const row of rawTrimmed) {
    const performer = row[0] ?? ''
    const title = row[1] ?? ''
    if (!title) continue
    rows.push({ performer, title })
  }
  return { headers, rows, raw: rawTrimmed }
}

import * as XLSX from 'xlsx'

export type ImportedWork = { performer: string; title: string }
export type ParsedWorksSheet = {
  /** Column headers: the file's first row, verbatim (used as-is in the PDF). */
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
 * names AND all columns in the generated PDF. The first row is always treated
 * as the header row.
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
  // Row 1 is always the header. Blank inner cells are kept so columns stay
  // aligned with the data; only trailing blanks (sheet range padding) are cut.
  const headers = [...grid[0]]
  while (headers.length && !headers[headers.length - 1]) headers.pop()
  // Drop rows that are entirely empty (e.g. blank separator lines).
  const rawTrimmed = grid.slice(1).filter((row) => row.some((c) => c.length > 0))

  const rows: ImportedWork[] = []
  for (const row of rawTrimmed) {
    const performer = row[0] ?? ''
    const title = row[1] ?? ''
    if (!title) continue
    rows.push({ performer, title })
  }
  return { headers, rows, raw: rawTrimmed }
}

import { layout, escapeHtml } from './_layout'
import { GRANT_TYPES, COVERAGE, MORAL_RIGHTS_NOTE } from '@/lib/rights'

export type ContractData = {
  party1Name: string
  party1NationalId: string
  territory: string
  termMonths: number
  coverage: string[]
}

export type Work = {
  titleAr: string
  singer: string
  composer: string
  lyricist: string
  arranger: string
}

export type AnnexData = {
  works: Work[]
}

const TERRITORY_AR: Record<string, string> = {
  EGYPT: 'جمهورية مصر العربية',
  MENA: 'منطقة الشرق الأوسط وشمال إفريقيا',
  WORLDWIDE: 'جميع أنحاء العالم',
}

export function renderContract(grantType: keyof typeof GRANT_TYPES, d: ContractData): string {
  // Trusted Arabic constants (GRANT_TYPES, COVERAGE, MORAL_RIGHTS_NOTE, TERRITORY_AR)
  // are our own static data and never contain special HTML characters — left unescaped.
  // The territory fallback and all caller-supplied party fields are escaped.
  const territory = TERRITORY_AR[d.territory] ?? escapeHtml(d.territory)
  const cov = d.coverage
    .map((k) => `<li>${COVERAGE[k as keyof typeof COVERAGE].ar}</li>`)
    .join('')
  const body = `
    <p>الطرف الأول: ${escapeHtml(d.party1Name)} — رقم قومي ${escapeHtml(d.party1NationalId)}.</p>
    <p>الطرف الثاني: لومينا ويفز للإنتاج والتوزيع الموسيقي.</p>
    <p>نوع المنح: <b>${GRANT_TYPES[grantType].ar}</b>.</p>
    <p>النطاق الجغرافي: ${territory}. المدة: ${d.termMonths} شهرًا.</p>
    <p>صور الاستغلال الممنوحة:</p><ul>${cov}</ul>
    <p style="font-weight:bold">${MORAL_RIGHTS_NOTE.ar}</p>`
  return layout({ titleAr: 'عقد استغلال مصنفات فنية', bodyHtml: body })
}

export function renderAnnex(d: AnnexData): string {
  const rows = d.works
    .map(
      (w) =>
        `<tr><td>${escapeHtml(w.titleAr)}</td><td>${escapeHtml(w.singer)}</td><td>${escapeHtml(w.lyricist)}</td><td>${escapeHtml(w.composer)}</td><td>${escapeHtml(w.arranger)}</td></tr>`,
    )
    .join('')
  const body = `
    <table>
      <thead>
        <tr>
          <th>الأغنية</th>
          <th>المطرب</th>
          <th>المؤلف</th>
          <th>الملحن</th>
          <th>الموزع الموسيقي</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`
  return layout({ titleAr: 'ملحق المصنفات', bodyHtml: body })
}

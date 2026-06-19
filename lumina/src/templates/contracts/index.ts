import { layout } from './_layout'
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
  const cov = d.coverage
    .map((k) => `<li>${COVERAGE[k as keyof typeof COVERAGE].ar}</li>`)
    .join('')
  const body = `
    <p>الطرف الأول: ${d.party1Name} — رقم قومي ${d.party1NationalId}.</p>
    <p>الطرف الثاني: لومينا ويفز للإنتاج والتوزيع الموسيقي.</p>
    <p>نوع المنح: <b>${GRANT_TYPES[grantType].ar}</b>.</p>
    <p>النطاق الجغرافي: ${TERRITORY_AR[d.territory] ?? d.territory}. المدة: ${d.termMonths} شهرًا.</p>
    <p>صور الاستغلال الممنوحة:</p><ul>${cov}</ul>
    <p style="font-weight:bold">${MORAL_RIGHTS_NOTE.ar}</p>`
  return layout({ titleAr: 'عقد استغلال مصنفات فنية', bodyHtml: body })
}

export function renderAnnex(d: AnnexData): string {
  const rows = d.works
    .map(
      (w) =>
        `<tr><td>${w.titleAr}</td><td>${w.singer}</td><td>${w.lyricist}</td><td>${w.composer}</td><td>${w.arranger}</td></tr>`,
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

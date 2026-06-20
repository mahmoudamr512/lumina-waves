// Arabic number-to-words (تفقيط) for contract money amounts.
// Handles non-negative integers up to 999,999,999,999 and appends the currency.
// Pragmatic legal-grade output (e.g. 10000 → "عشرة آلاف جنيه مصري"); not a full
// grammar engine, but correct for the amounts used in production contracts.

const ONES = [
  '', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة',
  'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر',
  'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر',
]
const TENS = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون']
const HUNDREDS = [
  '', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة',
  'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة',
]

/** Words for a number 0..999. */
function below1000(n: number): string {
  const parts: string[] = []
  const h = Math.floor(n / 100)
  const r = n % 100
  if (h) parts.push(HUNDREDS[h])
  if (r) {
    if (r < 20) {
      parts.push(ONES[r])
    } else {
      const t = Math.floor(r / 10)
      const o = r % 10
      parts.push(o ? `${ONES[o]} و${TENS[t]}` : TENS[t])
    }
  }
  return parts.join(' و')
}

// Scale labels: [singular, dual, plural(3-10)] — for values ≥11 the singular form is used.
const SCALES: Array<[string, string, string]> = [
  ['', '', ''],
  ['ألف', 'ألفان', 'آلاف'],
  ['مليون', 'مليونان', 'ملايين'],
  ['مليار', 'ملياران', 'مليارات'],
]

function scaleWord(group: number, scaleIndex: number): string {
  if (scaleIndex === 0) return below1000(group)
  const [one, two, few] = SCALES[scaleIndex]
  if (group === 1) return one
  if (group === 2) return two
  if (group >= 3 && group <= 10) return `${below1000(group)} ${few}`
  return `${below1000(group)} ${one}`
}

/** Convert an integer to Arabic words (no currency). */
export function numberToArabicWords(value: number): string {
  let n = Math.floor(Math.abs(value))
  if (n === 0) return 'صفر'
  const groups: string[] = []
  let scaleIndex = 0
  while (n > 0 && scaleIndex < SCALES.length) {
    const group = n % 1000
    if (group) groups.unshift(scaleWord(group, scaleIndex))
    n = Math.floor(n / 1000)
    scaleIndex++
  }
  return groups.join(' و')
}

/** Tafqeet for an EGP amount: "<words> جنيه مصري". */
export function egpInWords(amount: number): string {
  return `${numberToArabicWords(amount)} جنيه مصري`
}

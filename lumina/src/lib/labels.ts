// Arabic display labels for domain enums, shared across the client hub, the
// contract detail page, and the work detail page. Values mirror
// prisma/schema.prisma; unknown keys fall back to the raw value at the call site.

export const TERRITORY_AR: Record<string, string> = {
  EGYPT: 'جمهورية مصر العربية',
  WORLDWIDE: 'جمهورية مصر العربية وجميع أنحاء العالم',
}

export const CREDIT_ROLE_AR: Record<string, string> = {
  AUTHOR: 'مؤلف',
  COMPOSER: 'ملحن',
  ARRANGER: 'موزع',
  PERFORMER: 'مطرب/مؤدّي',
  PRODUCER: 'منتج',
}

export const WORK_STATUS_AR: Record<string, string> = {
  PENDING_ANNEX: 'في انتظار الملحق',
  LINKED: 'مرتبط',
}

export const DOC_STATUS_AR: Record<string, string> = {
  DRAFT: 'مسودة',
  EXECUTED: 'منفّذ',
}

export const RELEASE_TYPE_AR: Record<string, string> = {
  SINGLE: 'أغنية منفردة',
  EP: 'EP',
  ALBUM: 'ألبوم',
}

export const RELEASE_STATUS_AR: Record<string, string> = {
  PLANNED: 'مخطط له',
  RELEASED: 'صدر',
}

/** Render a month count as a human Arabic term ("سنتان" / "18 شهرًا"). */
export function termLabel(termMonths: number): string {
  if (termMonths % 12 === 0) {
    const years = termMonths / 12
    return `${years} ${years === 1 ? 'سنة' : 'سنوات'}`
  }
  return `${termMonths} شهرًا`
}

/** Format a date as an Arabic-Egyptian short date. */
export function formatDateAr(date: Date | string, withMonthLong = false): string {
  return new Date(date).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: withMonthLong ? 'long' : 'short',
    day: 'numeric',
  })
}

/** Whole days from now until a date (negative once past). Plain helper so callers
 * (incl. server components) can show a countdown without an impure call in render. */
export function daysFromNow(date: Date | string): number {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000)
}

const arNum = (n: number) => n.toLocaleString('ar-EG')

/** Arabic count word: 1→singular, 2→dual, 3-10→"{n} {few}", else→"{n} {many}". */
function arCount(n: number, singular: string, dual: string, few: string, many: string): string {
  if (n === 1) return singular
  if (n === 2) return dual
  if (n <= 10) return `${arNum(n)} ${few}`
  return `${arNum(n)} ${many}`
}

/** Relative Arabic time ("الآن" / "منذ ٥ دقائق" / "منذ ٣ ساعات" / "منذ يومين"), falling back to a date for old timestamps. */
export function timeAgoAr(date: Date | string, now: Date = new Date()): string {
  const then = new Date(date).getTime()
  const sec = Math.floor((now.getTime() - then) / 1000)
  if (sec < 60) return 'الآن'
  const min = Math.floor(sec / 60)
  if (min < 60) return `منذ ${arCount(min, 'دقيقة', 'دقيقتين', 'دقائق', 'دقيقة')}`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `منذ ${arCount(hr, 'ساعة', 'ساعتين', 'ساعات', 'ساعة')}`
  const day = Math.floor(hr / 24)
  if (day < 30) return `منذ ${arCount(day, 'يوم', 'يومين', 'أيام', 'يومًا')}`
  return formatDateAr(new Date(date))
}

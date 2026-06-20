// Arabic display labels for domain enums, shared across the client hub, the
// contract detail page, and the work detail page. Values mirror
// prisma/schema.prisma; unknown keys fall back to the raw value at the call site.

export const TERRITORY_AR: Record<string, string> = {
  EGYPT: 'جمهورية مصر العربية',
  MENA: 'منطقة الشرق الأوسط وشمال إفريقيا',
  WORLDWIDE: 'جميع أنحاء العالم',
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

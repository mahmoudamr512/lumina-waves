export const locales = ['ar', 'en'] as const
export const defaultLocale = 'ar'
export const dirFor = (l: string) => (l === 'ar' ? 'rtl' : 'ltr')

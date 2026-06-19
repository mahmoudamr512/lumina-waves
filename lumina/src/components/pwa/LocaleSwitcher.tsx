'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'

export function LocaleSwitcher() {
  const t = useTranslations('locale')
  const router = useRouter()

  function switchLocale() {
    const current = document.cookie
      .split('; ')
      .find((row) => row.startsWith('NEXT_LOCALE='))
      ?.split('=')[1]
    const next = current === 'en' ? 'ar' : 'en'
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000; SameSite=Lax`
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={switchLocale}
      className="rounded-md border border-border-elevation px-3 py-1.5 text-sm text-muted transition hover:border-gold-400/40 hover:text-foreground focus:outline-none focus:ring-1 focus:ring-gold-400"
    >
      {t('switchTo')}
    </button>
  )
}

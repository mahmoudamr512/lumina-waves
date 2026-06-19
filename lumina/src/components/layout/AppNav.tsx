'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import type { Role } from '@/generated/prisma/client'
import { LuminaLogo } from '@/components/brand'
import { ROLE_LABELS } from '@/lib/arabic'
import { cn } from '@/lib/cn'
import { LocaleSwitcher } from '@/components/pwa/LocaleSwitcher'

export interface AppNavProps {
  name: string
  role: Role
}

const NAV_HREFS: ReadonlyArray<{ href: string; key: string }> = [
  { href: '/clients', key: 'clients' },
  { href: '/contracts', key: 'contracts' },
  { href: '/works', key: 'works' },
  { href: '/documents', key: 'documents' },
  { href: '/search', key: 'search' },
]

/**
 * Top navigation for the authenticated app: brand lockup, section links with an
 * active state, the signed-in user's name + Arabic role badge, and a sign-out
 * control. Client component because it reads the active path and triggers
 * `signOut`.
 */
export function AppNav({ name, role }: AppNavProps) {
  const pathname = usePathname()
  const t = useTranslations('nav')
  const tAuth = useTranslations('auth')

  return (
    <header className="sticky top-0 z-20 border-b border-border-elevation bg-ink/70 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
        <Link href="/clients" aria-label={t('home')}>
          <LuminaLogo layout="horizontal" size={32} title="Lumina Waves" />
        </Link>

        <nav className="flex items-center gap-1 text-sm" aria-label={t('home')}>
          {NAV_HREFS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-md px-3 py-1.5 transition',
                  active
                    ? 'bg-gold-400/10 text-gold-200'
                    : 'text-muted hover:bg-white/5 hover:text-foreground',
                )}
              >
                {t(item.key as Parameters<typeof t>[0])}
              </Link>
            )
          })}
        </nav>

        <div className="ms-auto flex items-center gap-3">
          <div className="hidden text-end sm:block">
            <p className="text-sm font-medium leading-tight text-foreground">{name}</p>
            <p className="text-xs leading-tight text-gold-600">{ROLE_LABELS[role]}</p>
          </div>
          <LocaleSwitcher />
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="rounded-md border border-border-elevation px-3 py-1.5 text-sm text-muted transition hover:border-gold-400/40 hover:text-foreground focus:outline-none focus:ring-1 focus:ring-gold-400"
          >
            {tAuth('signOut')}
          </button>
        </div>
      </div>
    </header>
  )
}

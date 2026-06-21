'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { signOutAction } from '@/lib/session-actions'
import { useTranslations } from 'next-intl'
import type { Role } from '@/generated/prisma/client'
import { LuminaLogo } from '@/components/brand'
import { ROLE_LABELS } from '@/lib/arabic'
import { cn } from '@/lib/cn'
import { LocaleSwitcher } from '@/components/pwa/LocaleSwitcher'
import { IconMenu, IconClose } from './icons'

export interface SidebarItem {
  href: string
  /** translation key under the `nav` namespace */
  key: string
  icon: ReactNode
}

export interface SidebarProps {
  name: string
  role: Role
  items: SidebarItem[]
  /** URL to the signed-in user's avatar, if any (else initials fallback). */
  avatarUrl?: string
}

/**
 * Primary navigation. On desktop it is a persistent vertical rail (inline-start,
 * so the right side under RTL). On mobile it collapses behind a hamburger into
 * an off-canvas drawer. Sidebar owns its own mobile open state. Brand sits at
 * the top; the signed-in user, locale switcher, and sign-out are pinned to the
 * bottom.
 */
export function Sidebar({ name, role, items, avatarUrl }: SidebarProps) {
  const pathname = usePathname()
  const t = useTranslations('nav')
  const tAuth = useTranslations('auth')
  const tUi = useTranslations('ui')
  const [open, setOpen] = useState(false)

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4" aria-label={t('mainNav')}>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            onClick={() => setOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition focus-ring',
              active
                ? 'bg-gold-400/10 text-gold-200'
                : 'text-muted hover:bg-white/5 hover:text-foreground',
            )}
          >
            <span className="h-5 w-5 shrink-0">{item.icon}</span>
            {t(item.key as Parameters<typeof t>[0])}
          </Link>
        )
      })}
    </nav>
  )

  const footer = (
    <div className="border-t border-line px-3 py-4">
      <Link
        href="/account"
        onClick={() => setOpen(false)}
        className="mb-3 flex items-center gap-2.5 rounded-lg px-1 py-1.5 transition hover:bg-white/5 focus-ring"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-gold-400/10 text-xs font-semibold text-gold-200">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            name.trim().charAt(0) || '؟'
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-foreground">{name}</span>
          <span className="block text-xs text-gold-600">{ROLE_LABELS[role]}</span>
        </span>
      </Link>
      <div className="flex items-center justify-between gap-2">
        <LocaleSwitcher />
        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded-md border border-line-strong px-3 py-1.5 text-sm text-muted transition hover:border-gold-400/40 hover:text-foreground focus-ring"
          >
            {tAuth('signOut')}
          </button>
        </form>
      </div>
    </div>
  )

  const railContent = (
    <>
      <div className="flex items-center justify-between border-b border-line px-4 py-4">
        <Link href="/overview" aria-label={t('overview')} onClick={() => setOpen(false)}>
          <LuminaLogo layout="horizontal" size={30} title="Lumina Waves" />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={tUi('close')}
          className="rounded-md p-1 text-muted hover:bg-white/5 hover:text-foreground focus-ring md:hidden"
        >
          <IconClose className="h-5 w-5" />
        </button>
      </div>
      {nav}
      {footer}
    </>
  )

  return (
    <>
      {/* Mobile top bar with hamburger */}
      <div className="flex items-center gap-3 border-b border-line bg-ink/70 px-4 py-3 backdrop-blur-md md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={tUi('menu')}
          className="rounded-md p-1 text-muted hover:bg-white/5 hover:text-foreground focus-ring"
        >
          <IconMenu className="h-6 w-6" />
        </button>
        <LuminaLogo layout="horizontal" size={26} title="Lumina Waves" />
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-ink/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 start-0 flex w-72 max-w-[85vw] flex-col bg-surface">
            {railContent}
          </aside>
        </div>
      )}

      {/* Desktop persistent rail */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-e border-line bg-surface md:flex">
        {railContent}
      </aside>
    </>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import type { Role } from '@/generated/prisma/client'
import { LuminaLogo } from '@/components/brand'
import { ROLE_LABELS } from '@/lib/arabic'
import { cn } from '@/lib/cn'

export interface AppNavProps {
  name: string
  role: Role
}

const NAV_ITEMS: ReadonlyArray<{ href: string; label: string }> = [
  { href: '/clients', label: 'العملاء' },
  { href: '/contracts', label: 'العقود' },
  { href: '/works', label: 'الأعمال' },
  { href: '/documents', label: 'المستندات' },
  { href: '/search', label: 'البحث' },
]

/**
 * Top navigation for the authenticated app: brand lockup, section links with an
 * active state, the signed-in user's name + Arabic role badge, and a sign-out
 * control. Client component because it reads the active path and triggers
 * `signOut`.
 */
export function AppNav({ name, role }: AppNavProps) {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-20 border-b border-border-elevation bg-ink/70 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
        <Link href="/clients" aria-label="الصفحة الرئيسية">
          <LuminaLogo layout="horizontal" size={32} title="Lumina Waves" />
        </Link>

        <nav className="flex items-center gap-1 text-sm" aria-label="التنقل الرئيسي">
          {NAV_ITEMS.map((item) => {
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
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="ms-auto flex items-center gap-3">
          <div className="hidden text-end sm:block">
            <p className="text-sm font-medium leading-tight text-foreground">{name}</p>
            <p className="text-xs leading-tight text-gold-600">{ROLE_LABELS[role]}</p>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="rounded-md border border-border-elevation px-3 py-1.5 text-sm text-muted transition hover:border-gold-400/40 hover:text-foreground focus:outline-none focus:ring-1 focus:ring-gold-400"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    </header>
  )
}

'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/cn'

/**
 * Tab strip driven by a URL search param (default `tab`). Each tab is a link to
 * the same path with the param swapped, preserving any other params. This
 * component renders ONLY the strip — the server page reads the search param and
 * renders the matching panel, keeping data-loading on the server.
 */
export function Tabs({
  tabs,
  param = 'tab',
  active,
}: {
  tabs: Array<{ key: string; label: string }>
  param?: string
  active: string
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function hrefFor(key: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set(param, key)
    return `${pathname}?${params.toString()}`
  }

  return (
    <div role="tablist" className="mb-6 flex gap-1 border-b border-line">
      {tabs.map((tab) => {
        const selected = tab.key === active
        return (
          <Link
            key={tab.key}
            href={hrefFor(tab.key)}
            role="tab"
            aria-selected={selected}
            className={cn(
              '-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition focus-ring',
              selected
                ? 'border-gold-400 text-gold-200'
                : 'border-transparent text-muted hover:text-foreground',
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}

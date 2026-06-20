'use client'

import Link from 'next/link'
import { useMemo, useState, type ReactNode } from 'react'
import { normalizeArabic } from '@/lib/arabic'
import { Tabs, Card, CardBody, Input, EmptyState, IconSearch } from '@/components/ui'

export interface ClientSearchItem {
  id: string
  group: string
  title: string
  subtitle?: string
  href: string
  /** True for /documents/[id] links (secured file route → plain anchor). */
  external?: boolean
}

/**
 * Client hub body: a within-client search box over a flat index of everything
 * belonging to this client (contracts, works, releases, documents, folders).
 * When the box is empty it shows the normal tab strip + the active server-
 * rendered tab panel (passed as children). When a query is present it replaces
 * that with grouped, linked results filtered client-side (Arabic-normalized).
 */
export function ClientHub({
  active,
  tabs,
  items,
  children,
}: {
  active: string
  tabs: Array<{ key: string; label: string }>
  items: ClientSearchItem[]
  children: ReactNode
}) {
  const [query, setQuery] = useState('')
  const q = normalizeArabic(query.trim())
  const searching = q.length > 0

  const groups = useMemo(() => {
    if (!searching) return []
    const matched = items.filter((i) =>
      normalizeArabic(`${i.title} ${i.subtitle ?? ''}`).includes(q),
    )
    const byGroup = new Map<string, ClientSearchItem[]>()
    for (const item of matched) {
      const list = byGroup.get(item.group) ?? []
      list.push(item)
      byGroup.set(item.group, list)
    }
    return Array.from(byGroup, ([label, hits]) => ({ label, hits }))
  }, [items, q, searching])

  const total = groups.reduce((n, g) => n + g.hits.length, 0)

  return (
    <div className="space-y-6">
      <div className="relative max-w-md">
        <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-subtle">
          <IconSearch className="h-4 w-4" />
        </span>
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث داخل ملف العميل…"
          aria-label="بحث داخل ملف العميل"
          className="ps-9"
        />
      </div>

      {searching ? (
        total > 0 ? (
          <div className="space-y-8">
            {groups.map((group) => (
              <div key={group.label} className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-subtle">
                  {group.label} <span className="text-subtle">({group.hits.length})</span>
                </h2>
                <ul className="space-y-3">
                  {group.hits.map((hit) => (
                    <li key={`${hit.group}-${hit.id}`}>
                      <ResultLink href={hit.href} external={hit.external}>
                        <Card interactive>
                          <CardBody>
                            <p className="font-medium text-foreground">{hit.title}</p>
                            {hit.subtitle && <p className="mt-0.5 text-xs text-muted">{hit.subtitle}</p>}
                          </CardBody>
                        </Card>
                      </ResultLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<IconSearch className="h-6 w-6" />}
            title="لا توجد نتائج"
            body={`لا يوجد عنصر داخل هذا العميل يطابق «${query}».`}
          />
        )
      ) : (
        <>
          <Tabs tabs={tabs} active={active} />
          {children}
        </>
      )}
    </div>
  )
}

function ResultLink({ href, external, children }: { href: string; external?: boolean; children: ReactNode }) {
  const className = 'block rounded-xl focus-ring'
  return external ? (
    <a href={href} className={className}>
      {children}
    </a>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  )
}

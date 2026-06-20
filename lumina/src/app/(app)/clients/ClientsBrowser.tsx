'use client'

import { useMemo, useState } from 'react'
import { normalizeArabic } from '@/lib/arabic'
import { Input, Select, EmptyState, IconSearch } from '@/components/ui'
import { ClientsGrid, type ClientCard } from './ClientsGrid'

type SortKey = 'recent' | 'name'

/**
 * Client-side toolbar over the clients list: instant search (Arabic-normalized,
 * matching stage/legal name + national ID) plus sort. The full set is already
 * loaded by the server (role-redacted); filtering/sorting happens in the browser
 * so it is instant and needs no extra round-trips.
 */
export function ClientsBrowser({ clients }: { clients: ClientCard[] }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('recent')

  const filtered = useMemo(() => {
    const q = normalizeArabic(query.trim())
    let rows = clients
    if (q) {
      rows = clients.filter((c) => {
        const haystack = normalizeArabic(
          `${c.stageName ?? ''} ${c.legalName} ${c.nationalId ?? ''}`,
        )
        return haystack.includes(q)
      })
    }
    if (sort === 'name') {
      rows = [...rows].sort((a, b) =>
        (a.stageName || a.legalName).localeCompare(b.stageName || b.legalName, 'ar'),
      )
    }
    return rows
  }, [clients, query, sort])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-subtle">
            <IconSearch className="h-4 w-4" />
          </span>
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث بالاسم أو الرقم القومي…"
            aria-label="بحث في العملاء"
            className="ps-9"
          />
        </div>
        <Select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="ترتيب"
          className="sm:w-44"
        >
          <option value="recent">الأحدث أولًا</option>
          <option value="name">الاسم (أ–ي)</option>
        </Select>
      </div>

      {filtered.length > 0 ? (
        <>
          {query && (
            <p className="text-xs text-subtle">
              {filtered.length} من {clients.length} عميل
            </p>
          )}
          <ClientsGrid clients={filtered} />
        </>
      ) : (
        <EmptyState
          icon={<IconSearch className="h-6 w-6" />}
          title="لا توجد نتائج"
          body={`لم يُعثر على عميل يطابق «${query}».`}
        />
      )}
    </div>
  )
}

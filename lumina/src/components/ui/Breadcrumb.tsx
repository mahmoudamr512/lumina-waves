import Link from 'next/link'
import { Fragment } from 'react'
import { cn } from '@/lib/cn'

export interface Crumb {
  label: string
  href?: string
}

/**
 * Breadcrumb trail. The last item is treated as the current page (rendered
 * unlinked with aria-current="page"). The chevron separator flips automatically
 * under RTL because it is a logical character rotated for direction.
 */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
        {items.map((item, i) => {
          const last = i === items.length - 1
          return (
            <Fragment key={`${item.label}-${i}`}>
              <li>
                {item.href && !last ? (
                  <Link
                    href={item.href}
                    className="rounded transition hover:text-foreground focus-ring"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    aria-current={last ? 'page' : undefined}
                    className={cn(last && 'font-medium text-foreground')}
                  >
                    {item.label}
                  </span>
                )}
              </li>
              {!last && (
                <li aria-hidden className="select-none text-subtle rtl:rotate-180">
                  ›
                </li>
              )}
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}

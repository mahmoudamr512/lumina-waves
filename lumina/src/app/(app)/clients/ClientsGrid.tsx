'use client'

import { Stagger, StaggerItem } from '@/components/motion'

export interface ClientCard {
  id: string
  legalName: string
  stageName: string | null
  /** Null when redacted for the current role (OPERATIONS / VIEWER). */
  nationalId: string | null
}

/**
 * Responsive, animated grid of client cards. Each card shows the stage name
 * (falling back to the legal name) prominently, the legal name as a subtitle,
 * and the national ID only when present — otherwise a subtle "مخفي" lock chip,
 * never a broken empty cell. Animation is reduced-motion safe via Stagger.
 */
export function ClientsGrid({ clients }: { clients: ClientCard[] }) {
  return (
    <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
      {clients.map((client) => {
        const title = client.stageName || client.legalName
        const hasSubtitle = Boolean(client.stageName) && client.stageName !== client.legalName

        return (
          <StaggerItem key={client.id}>
            <article className="group h-full rounded-2xl border border-border-elevation bg-surface/70 p-5 transition hover:border-gold-400/40 hover:bg-surface">
              <h2 className="truncate text-lg font-semibold text-foreground" title={title}>
                {title}
              </h2>
              {hasSubtitle && (
                <p className="mt-0.5 truncate text-sm text-muted" title={client.legalName}>
                  {client.legalName}
                </p>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-border-elevation pt-3">
                <span className="text-xs text-muted">الرقم القومي</span>
                {client.nationalId ? (
                  <span dir="ltr" className="font-mono text-sm tabular-nums text-foreground">
                    {client.nationalId}
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-xs text-muted"
                    title="غير مصرّح لك بعرض هذه البيانات"
                  >
                    <LockIcon />
                    مخفي
                  </span>
                )}
              </div>
            </article>
          </StaggerItem>
        )
      })}
    </Stagger>
  )
}

function LockIcon() {
  return (
    <svg
      aria-hidden="true"
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

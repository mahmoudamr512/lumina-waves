'use client'

import Link from 'next/link'
import { Stagger, StaggerItem } from '@/components/motion'
import { Card, CardBody, IconLock } from '@/components/ui'

export interface ClientCard {
  id: string
  legalName: string
  stageName: string | null
  /** Null when redacted for the current role (OPERATIONS / VIEWER). */
  nationalId: string | null
}

/**
 * Responsive, animated grid of client cards. Each card links to the client hub
 * (/clients/[id]). Shows the stage name (falling back to the legal name)
 * prominently, the legal name as a subtitle, and the national ID only when
 * present — otherwise a subtle locked chip. Reduced-motion safe via Stagger.
 */
export function ClientsGrid({ clients }: { clients: ClientCard[] }) {
  return (
    <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
      {clients.map((client) => {
        const title = client.stageName || client.legalName
        const hasSubtitle = Boolean(client.stageName) && client.stageName !== client.legalName

        return (
          <StaggerItem key={client.id}>
            <Link href={`/clients/${client.id}`} className="block h-full rounded-xl focus-ring">
              <Card interactive className="h-full">
                <CardBody>
                  <h2 className="truncate text-lg font-semibold text-foreground" title={title}>
                    {title}
                  </h2>
                  {hasSubtitle && (
                    <p className="mt-0.5 truncate text-sm text-muted" title={client.legalName}>
                      {client.legalName}
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
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
                        <IconLock className="h-3 w-3" />
                        مخفي
                      </span>
                    )}
                  </div>
                </CardBody>
              </Card>
            </Link>
          </StaggerItem>
        )
      })}
    </Stagger>
  )
}

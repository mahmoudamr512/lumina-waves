import { Card, CardHeader, CardBody, Badge, EmptyState, statusVariant, IconWorks } from '@/components/ui'
import { CREDIT_ROLE_AR, RELEASE_TYPE_AR, RELEASE_STATUS_AR, formatDateAr } from '@/lib/labels'
import AddReleaseForm from '../AddReleaseForm'
import AddTrackForm from '../AddTrackForm'
import type { ClientTree } from '../page'

/** Releases tab: release cards with their tracks; modal add-release/add-track. */
export function ReleasesTab({
  clientId,
  releases,
  canAddRelease,
}: {
  clientId: string
  releases: ClientTree['releases']
  canAddRelease: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-xl font-semibold text-foreground">الإصدارات</h2>
        {canAddRelease && <AddReleaseForm clientId={clientId} />}
      </div>

      {releases.length === 0 ? (
        <EmptyState
          icon={<IconWorks className="h-6 w-6" />}
          title="لا توجد إصدارات بعد"
          body="أضف أول إصدار لهذا العميل."
        />
      ) : (
        <div className="space-y-4">
          {releases.map((release) => (
            <Card key={String(release.id)}>
              <CardHeader>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-foreground">{release.title}</h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="neutral">{RELEASE_TYPE_AR[release.type] ?? String(release.type)}</Badge>
                    <Badge variant={statusVariant(release.status)}>
                      {RELEASE_STATUS_AR[release.status] ?? String(release.status)}
                    </Badge>
                    {release.releaseDate && (
                      <span className="text-muted">{formatDateAr(release.releaseDate as Date, true)}</span>
                    )}
                  </div>
                </div>
                {canAddRelease && <AddTrackForm releaseId={String(release.id)} clientId={clientId} />}
              </CardHeader>

              <CardBody>
                {release.works.length === 0 ? (
                  <p className="text-sm text-muted">لا توجد مقطوعات بعد.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {release.works.map((work) => (
                      <li key={String(work.id)} className="space-y-2 py-3 first:pt-0 last:pb-0">
                        <p className="text-sm font-medium text-foreground">{work.title}</p>
                        {work.credits.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {work.credits.map((credit) => (
                              <span
                                key={credit.id}
                                className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-xs text-muted"
                              >
                                <span className="text-gold-600">
                                  {CREDIT_ROLE_AR[credit.role] ?? credit.role}:
                                </span>
                                <span>{credit.name}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

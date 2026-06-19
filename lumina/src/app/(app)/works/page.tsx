import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { listWorks } from '@/services/works'
import { FadeIn, Stagger, StaggerItem } from '@/components/motion'
import { LuminaWaveMark } from '@/components/brand'
import { cn } from '@/lib/cn'

export const metadata = {
  title: 'الأعمال | Lumina Waves',
}

export const dynamic = 'force-dynamic'

const WORK_STATUS_AR: Record<string, string> = {
  PENDING_ANNEX: 'في انتظار الملحق',
  LINKED: 'مرتبط',
}

const CREDIT_ROLE_AR: Record<string, string> = {
  AUTHOR: 'مؤلف',
  COMPOSER: 'ملحن',
  ARRANGER: 'موزع',
  PERFORMER: 'مطرب/مؤدّي',
  PRODUCER: 'منتج',
}

/**
 * Flat list of all works (RSC). Each work title links to its client's tree
 * detail page when a client is available. Credits shown as role chips.
 */
export default async function WorksPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const works = await listWorks()

  return (
    <section className="space-y-8">
      <FadeIn>
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border-elevation pb-5">
          <div className="space-y-1">
            <h1 className="font-display text-3xl font-semibold text-gold-metallic">الأعمال</h1>
            <p className="text-sm text-muted">
              {works.length > 0 ? `${works.length} عمل مسجّل` : 'إدارة أعمال لومينا ويفز'}
            </p>
          </div>
        </header>
      </FadeIn>

      {works.length === 0 ? (
        <FadeIn
          delay={0.1}
          className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-border-elevation py-20 text-center"
        >
          <LuminaWaveMark size={72} variant="gold" title="لا توجد أعمال" />
          <div className="space-y-1">
            <p className="text-lg font-medium text-foreground">لا توجد أعمال بعد</p>
            <p className="text-sm text-muted">ستظهر الأعمال الموسيقية هنا بعد إضافتها.</p>
          </div>
        </FadeIn>
      ) : (
        <Stagger stagger={0.04} delayChildren={0.05}>
          <ul
            className="overflow-hidden divide-y divide-border-elevation rounded-2xl border border-border-elevation"
            role="list"
          >
            {works.map((work) => {
              const client = work.annex?.contract?.client
              const clientName = client ? (client.stageName ?? client.legalName) : null
              const clientId = work.annex?.contract?.clientId ?? null

              return (
                <StaggerItem key={work.id} className="contents">
                  <li className="flex flex-wrap items-start gap-3 bg-surface/40 px-5 py-4 transition hover:bg-surface">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      {clientId ? (
                        <Link
                          href={`/clients/${clientId}`}
                          className="group focus:outline-none"
                        >
                          <p className="truncate text-sm font-semibold text-foreground transition group-hover:text-gold-200">
                            {work.title}
                          </p>
                        </Link>
                      ) : (
                        <p className="truncate text-sm font-semibold text-foreground">
                          {work.title}
                        </p>
                      )}
                      {clientName && clientId && (
                        <Link
                          href={`/clients/${clientId}`}
                          className="text-xs text-muted transition hover:text-foreground"
                        >
                          {clientName}
                          {work.annex && ` · ملحق رقم ${work.annex.number}`}
                        </Link>
                      )}
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
                    </div>
                    <span
                      className={cn(
                        'mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium',
                        work.status === 'LINKED'
                          ? 'bg-gold-400/10 text-gold-200'
                          : 'bg-white/5 text-muted',
                      )}
                    >
                      {WORK_STATUS_AR[work.status] ?? work.status}
                    </span>
                  </li>
                </StaggerItem>
              )
            })}
          </ul>
        </Stagger>
      )}
    </section>
  )
}

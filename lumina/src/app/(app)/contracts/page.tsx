import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { can } from '@/lib/authz'
import { listContracts } from '@/services/contracts'
import { GRANT_TYPES } from '@/lib/rights'
import { FadeIn, Stagger, StaggerItem } from '@/components/motion'
import { LuminaWaveMark } from '@/components/brand'

export const metadata = {
  title: 'العقود | Lumina Waves',
}

export const dynamic = 'force-dynamic'

const TERRITORY_AR: Record<string, string> = {
  EGYPT: 'جمهورية مصر العربية',
  MENA: 'منطقة الشرق الأوسط وشمال إفريقيا',
  WORLDWIDE: 'جميع أنحاء العالم',
}

/**
 * Flat list of all master contracts (RSC). Each row links to its client's
 * tree detail page. ADMIN and LEGAL also see a link to generate a PDF draft.
 */
export default async function ContractsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const role = session.user.role
  const canGenerate = can(role, 'create', 'Document') && ['ADMIN', 'LEGAL'].includes(role)

  const contracts = await listContracts()

  return (
    <section className="space-y-8">
      <FadeIn>
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border-elevation pb-5">
          <div className="space-y-1">
            <h1 className="font-display text-3xl font-semibold text-gold-metallic">العقود</h1>
            <p className="text-sm text-muted">
              {contracts.length > 0 ? `${contracts.length} عقد مسجّل` : 'إدارة عقود لومينا ويفز'}
            </p>
          </div>
        </header>
      </FadeIn>

      {contracts.length === 0 ? (
        <FadeIn
          delay={0.1}
          className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-border-elevation py-20 text-center"
        >
          <LuminaWaveMark size={72} variant="gold" title="لا توجد عقود" />
          <div className="space-y-1">
            <p className="text-lg font-medium text-foreground">لا توجد عقود بعد</p>
            <p className="text-sm text-muted">ستظهر العقود هنا بعد إنشائها.</p>
          </div>
        </FadeIn>
      ) : (
        <Stagger stagger={0.04} delayChildren={0.05}>
          <ul
            className="overflow-hidden divide-y divide-border-elevation rounded-2xl border border-border-elevation"
            role="list"
          >
            {contracts.map((contract) => {
              const grantLabel = GRANT_TYPES[contract.grantType as keyof typeof GRANT_TYPES]
              const clientName =
                contract.client.stageName ?? contract.client.legalName
              const termMonths = contract.termMonths as number
              const termYears =
                termMonths % 12 === 0
                  ? `${termMonths / 12} ${termMonths / 12 === 1 ? 'سنة' : 'سنوات'}`
                  : `${termMonths} شهرًا`

              return (
                <StaggerItem key={String(contract.id)} className="contents">
                  <li className="flex flex-wrap items-center justify-between gap-3 bg-surface/40 px-5 py-4 transition hover:bg-surface">
                    <Link
                      href={`/clients/${String(contract.clientId)}`}
                      className="group min-w-0 flex-1 space-y-0.5 focus:outline-none"
                    >
                      <p className="truncate text-sm font-medium text-foreground transition group-hover:text-gold-200">
                        {clientName}
                      </p>
                      <p className="text-xs text-muted">
                        {grantLabel?.ar ?? String(contract.grantType)} ·{' '}
                        {TERRITORY_AR[contract.territory as string] ?? String(contract.territory)} ·{' '}
                        {termYears}
                      </p>
                    </Link>
                    {canGenerate && (
                      <Link
                        href={`/contracts/${String(contract.id)}/generate`}
                        className="shrink-0 rounded-lg border border-gold-400/30 px-3 py-1.5 text-xs font-medium text-gold-200 transition hover:border-gold-400/60 focus:outline-none focus:ring-2 focus:ring-gold-200"
                      >
                        إنشاء PDF
                      </Link>
                    )}
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

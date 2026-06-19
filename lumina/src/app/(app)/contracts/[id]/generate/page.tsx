import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { can } from '@/lib/authz'
import { getContract } from '@/services/contracts'
import { GRANT_TYPES, COVERAGE } from '@/lib/rights'
import { FadeIn } from '@/components/motion'
import { GenerateContractForm } from './GenerateContractForm'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return { title: `إنشاء مستند العقد ${id} | Lumina Waves` }
}

/**
 * Contract generation wizard. Only ADMIN and LEGAL may access this page —
 * the same roles that can call generateContractPdf. Guarded here at the page
 * level (fail-fast) and again at the service level (defence in depth).
 */
export default async function GenerateContractPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const session = await auth()
  if (!session?.user) redirect('/login')

  // Only ADMIN and LEGAL may generate documents (sensitive National ID embedded)
  const role = session.user.role
  if (!['ADMIN', 'LEGAL'].includes(role)) {
    redirect(`/contracts`)
  }

  // Verify the contract exists and the user can read it
  if (!can(role, 'read', 'MasterContract')) {
    redirect('/contracts')
  }

  const contract = await getContract(id)
  if (!contract) notFound()

  const grantLabel = GRANT_TYPES[contract.grantType as keyof typeof GRANT_TYPES]
  const coverageList = (contract.coverage as string[]).map(
    (k) => COVERAGE[k as keyof typeof COVERAGE],
  )

  const TERRITORY_AR: Record<string, string> = {
    EGYPT: 'جمهورية مصر العربية',
    MENA: 'منطقة الشرق الأوسط وشمال إفريقيا',
    WORLDWIDE: 'جميع أنحاء العالم',
  }

  return (
    <section className="mx-auto max-w-xl space-y-8" dir="rtl">
      <FadeIn>
        <header className="space-y-1 border-b border-border-elevation pb-5">
          <h1 className="font-display text-3xl font-semibold text-gold-metallic">
            إنشاء مستند العقد
          </h1>
          <p className="text-sm text-muted">
            مراجعة تفاصيل العقد وتوليد مسودة PDF.
          </p>
        </header>
      </FadeIn>

      {/* Contract summary — review section */}
      <FadeIn delay={0.05}>
        <div className="rounded-xl border border-border-elevation bg-surface/40 p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">مراجعة العقد</h2>

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted">رقم العقد</dt>
              <dd className="font-mono text-foreground ltr">{contract.id.slice(0, 12)}…</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">نوع المنح</dt>
              <dd className="text-foreground">{grantLabel?.ar ?? contract.grantType}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">النطاق الجغرافي</dt>
              <dd className="text-foreground">
                {TERRITORY_AR[contract.territory] ?? contract.territory}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">المدة</dt>
              <dd className="text-foreground">{contract.termMonths} شهرًا</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-muted">صور الاستغلال</dt>
              <dd>
                <ul className="space-y-0.5">
                  {coverageList.map((c, i) => (
                    <li key={i} className="text-foreground text-sm flex items-center gap-1.5">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold-400 shrink-0" />
                      {c?.ar}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          </dl>
        </div>
      </FadeIn>

      {/* Generation form */}
      <FadeIn delay={0.1}>
        <GenerateContractForm contractId={id} />
      </FadeIn>

      <Link
        href="/contracts"
        className="inline-block text-sm text-muted transition hover:text-foreground"
      >
        ← العودة إلى قائمة العقود
      </Link>
    </section>
  )
}

import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { can } from '@/lib/authz'
import { getContract } from '@/services/contracts'
import { GRANT_TYPES, COVERAGE_MODES } from '@/lib/rights'
import { FadeIn } from '@/components/motion'
import { Breadcrumb, Card, CardHeader, CardBody, buttonClasses } from '@/components/ui'
import { TERRITORY_AR, termLabel } from '@/lib/labels'
import { GenerateContractForm } from './GenerateContractForm'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return { title: `إنشاء مستند العقد ${id} | Lumina Waves` }
}

/**
 * Contract generation wizard. Only ADMIN and LEGAL may access this page — the
 * same roles that can call generateContractPdf. Guarded at the page level
 * (fail-fast) and again at the service level (defence in depth).
 */
export default async function GenerateContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const session = await auth()
  if (!session?.user) redirect('/login')

  const role = session.user.role
  if (!['ADMIN', 'LEGAL'].includes(role)) redirect('/contracts')
  if (!can(role, 'read', 'MasterContract')) redirect('/contracts')

  const contract = await getContract(id)
  if (!contract) notFound()

  const grantLabel = GRANT_TYPES[contract.grantType as keyof typeof GRANT_TYPES]
  const coverageModeLabel = COVERAGE_MODES[contract.coverageMode as keyof typeof COVERAGE_MODES]
  const coverageExclusions = (contract.coverageExclusions ?? []) as string[]

  return (
    <section className="mx-auto max-w-xl space-y-8">
      <Breadcrumb
        items={[
          { label: 'نظرة عامة', href: '/overview' },
          { label: 'العقود', href: '/contracts' },
          { label: grantLabel?.ar ?? String(contract.grantType), href: `/contracts/${id}` },
          { label: 'إنشاء PDF' },
        ]}
      />

      <FadeIn>
        <header className="space-y-1 border-b border-line pb-5">
          <h1 className="font-display text-3xl font-semibold text-gold-metallic">إنشاء مستند العقد</h1>
          <p className="text-sm text-muted">مراجعة تفاصيل العقد وتوليد مسودة PDF.</p>
        </header>
      </FadeIn>

      <FadeIn delay={0.05}>
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-foreground">مراجعة العقد</h2>
            <Link href={`/contracts/${id}`} className={buttonClasses('ghost', 'sm')}>
              تعديل العقد
            </Link>
          </CardHeader>
          <CardBody>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted">نوع المنح</dt>
                <dd className="text-foreground">{grantLabel?.ar ?? contract.grantType}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">النطاق الجغرافي</dt>
                <dd className="text-foreground">{TERRITORY_AR[contract.territory] ?? contract.territory}</dd>
              </div>
              {contract.termMonths != null && (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">المدة</dt>
                  <dd className="text-foreground">{termLabel(contract.termMonths as number)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <dt className="text-muted">نطاق التغطية</dt>
                <dd className="text-foreground">{coverageModeLabel?.ar ?? String(contract.coverageMode)}</dd>
              </div>
              {coverageExclusions.length > 0 && (
                <div className="flex flex-col gap-1">
                  <dt className="text-muted">الاستثناءات</dt>
                  <dd className="text-foreground">باستثناء: {coverageExclusions.join('، و')}</dd>
                </div>
              )}
            </dl>
          </CardBody>
        </Card>
      </FadeIn>

      <FadeIn delay={0.1}>
        <GenerateContractForm contractId={id} />
      </FadeIn>
    </section>
  )
}

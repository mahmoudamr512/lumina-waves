import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { can } from '@/lib/authz'
import { listContracts } from '@/services/contracts'
import { GRANT_TYPES } from '@/lib/rights'
import { FadeIn } from '@/components/motion'
import { Breadcrumb, Table, THead, TBody, TR, TH, TD, Badge, EmptyState, buttonClasses, IconContracts } from '@/components/ui'
import { TERRITORY_AR, termLabel } from '@/lib/labels'

export const metadata = {
  title: 'العقود | Lumina Waves',
}

export const dynamic = 'force-dynamic'

/**
 * Flat list of all master contracts (RSC). Each row links to the focused
 * contract detail page. ADMIN and LEGAL also see a generate-PDF row action.
 */
export default async function ContractsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const role = session.user.role
  const canGenerate = can(role, 'create', 'Document') && ['ADMIN', 'LEGAL'].includes(role)

  const contracts = await listContracts()

  return (
    <section className="space-y-8">
      <Breadcrumb items={[{ label: 'نظرة عامة', href: '/overview' }, { label: 'العقود' }]} />

      <FadeIn>
        <header className="border-b border-line pb-5">
          <h1 className="font-display text-3xl font-semibold text-gold-metallic">العقود</h1>
          <p className="mt-1 text-sm text-muted">
            {contracts.length > 0 ? `${contracts.length} عقد مسجّل` : 'إدارة عقود لومينا ويفز'}
          </p>
        </header>
      </FadeIn>

      {contracts.length === 0 ? (
        <EmptyState
          icon={<IconContracts className="h-6 w-6" />}
          title="لا توجد عقود بعد"
          body="ستظهر العقود هنا بعد إنشائها."
        />
      ) : (
        <FadeIn delay={0.05}>
          <Table>
            <THead>
              <tr>
                <TH>العميل</TH>
                <TH>النوع</TH>
                <TH>النطاق</TH>
                <TH>المدة</TH>
                {canGenerate && <TH>إجراءات</TH>}
              </tr>
            </THead>
            <TBody>
              {contracts.map((contract) => {
                const grantLabel = GRANT_TYPES[contract.grantType as keyof typeof GRANT_TYPES]
                const clientName = contract.client.stageName ?? contract.client.legalName
                return (
                  <TR key={String(contract.id)} href={`/contracts/${String(contract.id)}`}>
                    <TD className="font-medium">{clientName}</TD>
                    <TD>
                      <Badge variant="gold">{grantLabel?.ar ?? String(contract.grantType)}</Badge>
                    </TD>
                    <TD className="text-muted">
                      {TERRITORY_AR[contract.territory as string] ?? String(contract.territory)}
                    </TD>
                    <TD className="text-muted">{termLabel(contract.termMonths as number)}</TD>
                    {canGenerate && (
                      <TD className="relative z-10">
                        <Link
                          href={`/contracts/${String(contract.id)}/generate`}
                          className={buttonClasses('secondary', 'sm')}
                        >
                          إنشاء PDF
                        </Link>
                      </TD>
                    )}
                  </TR>
                )
              })}
            </TBody>
          </Table>
        </FadeIn>
      )}
    </section>
  )
}

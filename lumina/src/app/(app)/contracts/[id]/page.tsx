import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { can } from '@/lib/authz'
import { getContractDetail } from '@/services/contracts'
import { GRANT_TYPES } from '@/lib/rights'
import { FadeIn } from '@/components/motion'
import {
  Breadcrumb,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  EmptyState,
  buttonClasses,
  statusVariant,
  IconPlus,
} from '@/components/ui'
import { TERRITORY_AR, CREDIT_ROLE_AR, WORK_STATUS_AR, DOC_STATUS_AR, termLabel, formatDateAr, daysFromNow } from '@/lib/labels'
import AddAnnexButton from '@/app/(app)/clients/[id]/AddAnnexButton'
import GenerateAnnexButton from '@/app/(app)/clients/[id]/GenerateAnnexButton'
import AttachDocumentForm from '@/app/(app)/clients/[id]/AttachDocumentForm'
import { ActivityPanel } from '@/components/activity/ActivityPanel'
import { getEntityPanel } from '@/services/activity-panel'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) return {}
  const contract = await getContractDetail(id)
  if (!contract) return {}
  const grant = GRANT_TYPES[contract.grantType as keyof typeof GRANT_TYPES]?.ar ?? String(contract.grantType)
  return { title: `${grant} | Lumina Waves` }
}

/** Focused contract detail: summary header + annex→work tree + documents. */
export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')
  const role = session.user.role

  const contract = await getContractDetail(id)
  if (!contract) notFound()

  const clientId = String(contract.client.id)
  const clientName = contract.client.stageName ?? contract.client.legalName
  const grantLabel = GRANT_TYPES[contract.grantType as keyof typeof GRANT_TYPES]?.ar ?? String(contract.grantType)
  const canGenerate = can(role, 'create', 'Document') && ['ADMIN', 'LEGAL'].includes(role)
  const canAttach = can(role, 'create', 'Document')
  const canAddAnnex = can(role, 'create', 'Annex')
  const canAddWork = can(role, 'create', 'Work')
  const panel = await getEntityPanel('MasterContract', id)
  const expiryDays = contract.expiresAt != null ? daysFromNow(contract.expiresAt as Date) : null

  return (
    <section className="space-y-8">
      <Breadcrumb
        items={[
          { label: 'نظرة عامة', href: '/overview' },
          { label: 'العملاء', href: '/clients' },
          { label: clientName, href: `/clients/${clientId}` },
          { label: 'العقود', href: '/contracts' },
          { label: grantLabel },
        ]}
      />

      <FadeIn>
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
          <div className="space-y-2">
            <Badge variant="gold">عقد رئيسي</Badge>
            <h1 className="font-display text-3xl font-semibold text-gold-metallic">{grantLabel}</h1>
            <dl className="flex flex-wrap gap-x-6 gap-y-1 pt-1 text-sm">
              <div className="flex gap-1.5">
                <dt className="text-muted">النطاق:</dt>
                <dd className="text-foreground">
                  {TERRITORY_AR[contract.territory as string] ?? String(contract.territory)}
                </dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="text-muted">المدة:</dt>
                <dd className="text-foreground">{termLabel(contract.termMonths as number)}</dd>
              </div>
              {contract.expiresAt != null && (
                <div className="flex gap-1.5">
                  <dt className="text-muted">تاريخ الانتهاء:</dt>
                  <dd className="text-foreground" data-testid="contract-expiry">
                    {formatDateAr(contract.expiresAt as Date)}
                    {expiryDays != null && expiryDays <= 0 && <span className="text-rose-400"> (منتهٍ)</span>}
                    {expiryDays != null && expiryDays > 0 && expiryDays <= 90 && (
                      <span className="text-amber-400"> (خلال {expiryDays} يومًا)</span>
                    )}
                  </dd>
                </div>
              )}
              {contract.revenueShareBps != null && (
                <div className="flex gap-1.5">
                  <dt className="text-muted">الحصة:</dt>
                  <dd className="text-foreground">{((contract.revenueShareBps as number) / 100).toFixed(2)}%</dd>
                </div>
              )}
              {contract.minPayoutCents != null && (
                <div className="flex gap-1.5">
                  <dt className="text-muted">
                    {contract.grantType === 'SALE' ? 'مبلغ التنازل:' : 'الحد الأدنى:'}
                  </dt>
                  <dd className="text-foreground">
                    {((contract.minPayoutCents as number) / 100).toLocaleString('en-US')} ج.م.
                  </dd>
                </div>
              )}
            </dl>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {canGenerate && (
              <Link href={`/contracts/${id}/generate`} className={buttonClasses('secondary', 'sm')}>
                إنشاء PDF
              </Link>
            )}
            {canAddAnnex && <AddAnnexButton contractId={id} clientId={clientId} />}
          </div>
        </header>
      </FadeIn>

      {/* Contract-level documents */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-foreground">مستندات العقد</h2>
          {canAttach && <AttachDocumentForm clientId={clientId} contractId={id} contextLabel="العقد" />}
        </div>
        {contract.documents.length === 0 ? (
          <p className="text-sm text-muted">لا توجد مستندات على مستوى العقد.</p>
        ) : (
          <ul className="space-y-1.5">
            {contract.documents.map((doc) => (
              <li key={String(doc.id)} className="flex items-center justify-between gap-3 text-sm">
                <a
                  href={`/documents/${String(doc.id)}`}
                  className="rounded text-foreground underline-offset-2 transition hover:text-gold-200 hover:underline focus-ring"
                >
                  {String(doc.filename)}
                </a>
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant(String(doc.status))}>
                    {DOC_STATUS_AR[doc.status as string] ?? String(doc.status)}
                  </Badge>
                  <span className="text-xs text-muted">{formatDateAr(doc.createdAt as Date)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Annexes */}
      <div className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-foreground">الملاحق</h2>
        {contract.annexes.length === 0 ? (
          <EmptyState title="لا توجد ملاحق بعد" body="اضغط «إضافة ملحق» لإنشاء أول ملحق." />
        ) : (
          contract.annexes.map((annex) => (
            <Card key={String(annex.id)}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-foreground">ملحق رقم {annex.number}</h3>
                  <span className="text-xs text-muted">{formatDateAr(annex.annexDate as Date, true)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {canGenerate && <GenerateAnnexButton annexId={String(annex.id)} contractId={id} />}
                  {canAddWork && (
                    <Link
                      href={`/clients/${clientId}/annexes/${String(annex.id)}/works/new`}
                      className={buttonClasses('ghost', 'sm')}
                    >
                      <IconPlus className="h-4 w-4" /> إضافة عمل
                    </Link>
                  )}
                </div>
              </CardHeader>
              <CardBody className="space-y-4">
                {annex.works.length === 0 ? (
                  <p className="text-sm text-muted">لا توجد أعمال في هذا الملحق بعد.</p>
                ) : (
                  <Table>
                    <THead>
                      <tr>
                        <TH>العمل</TH>
                        <TH>الحالة</TH>
                        <TH>الاعتمادات</TH>
                      </tr>
                    </THead>
                    <TBody>
                      {annex.works.map((work) => (
                        <TR key={String(work.id)} href={`/works/${String(work.id)}`}>
                          <TD className="font-medium">{work.title}</TD>
                          <TD className="relative z-10">
                            <Badge variant={statusVariant(work.status)}>
                              {WORK_STATUS_AR[work.status] ?? work.status}
                            </Badge>
                          </TD>
                          <TD className="text-muted">
                            {work.credits.map((c) => CREDIT_ROLE_AR[c.role] ?? c.role).join('، ') || '—'}
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                )}

                <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
                  <div className="min-w-0 flex-1">
                    {annex.documents.length > 0 ? (
                      <ul className="space-y-1">
                        {annex.documents.map((doc) => (
                          <li key={String(doc.id)} className="flex items-center gap-2 text-xs">
                            <a
                              href={`/documents/${String(doc.id)}`}
                              className="rounded text-foreground underline-offset-2 transition hover:text-gold-200 hover:underline focus-ring"
                            >
                              {String(doc.filename)}
                            </a>
                            <Badge variant={statusVariant(String(doc.status))}>
                              {DOC_STATUS_AR[doc.status as string] ?? String(doc.status)}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted">لا توجد مستندات للملحق.</p>
                    )}
                  </div>
                  {canAttach && (
                    <AttachDocumentForm
                      clientId={clientId}
                      annexId={String(annex.id)}
                      contextLabel={`ملحق رقم ${annex.number}`}
                    />
                  )}
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </div>

      <Card>
        <CardHeader><h2 className="text-base font-semibold text-foreground">النشاط</h2></CardHeader>
        <CardBody>
          <ActivityPanel
            entity="MasterContract"
            entityId={id}
            path={`/contracts/${id}`}
            activity={panel.activity}
            comments={panel.comments}
            isAdmin={panel.isAdmin} isWatching={panel.isWatching}
          />
        </CardBody>
      </Card>
    </section>
  )
}

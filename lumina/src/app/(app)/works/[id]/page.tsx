import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { can } from '@/lib/authz'
import { getWork } from '@/services/works'
import { GRANT_TYPES } from '@/lib/rights'
import { FadeIn } from '@/components/motion'
import { Breadcrumb, Card, CardBody, CardHeader, Badge, Table, THead, TBody, TR, TH, TD, EmptyState, statusVariant } from '@/components/ui'
import { CREDIT_ROLE_AR, WORK_STATUS_AR } from '@/lib/labels'
import { ActivityPanel } from '@/components/activity/ActivityPanel'
import { getEntityPanel } from '@/services/activity-panel'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) return {}
  const work = await getWork(id)
  return { title: work ? `${work.title} | Lumina Waves` : 'Lumina Waves' }
}

/** Focused work detail: title + status, credits, and parent annex/contract/client. */
export default async function WorkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!can(session.user.role, 'read', 'Work')) notFound()

  const work = await getWork(id)
  if (!work) notFound()
  const panel = await getEntityPanel('Work', id)

  const annex = work.annex
  const contract = annex?.contract
  const client = contract?.client
  const clientName = client?.stageName ?? client?.legalName ?? null
  const grantLabel = contract
    ? GRANT_TYPES[contract.grantType as keyof typeof GRANT_TYPES]?.ar ?? String(contract.grantType)
    : null

  const crumbs = [
    { label: 'نظرة عامة', href: '/overview' },
    { label: 'الأعمال', href: '/works' },
    { label: work.title },
  ]

  return (
    <section className="space-y-8">
      <Breadcrumb items={crumbs} />

      <FadeIn>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-6">
          <h1 className="font-display text-3xl font-semibold text-gold-metallic">{work.title}</h1>
          <Badge variant={statusVariant(work.status)}>{WORK_STATUS_AR[work.status] ?? work.status}</Badge>
        </header>
      </FadeIn>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-foreground">الاعتمادات</h2>
        </CardHeader>
        <CardBody>
          {work.credits.length === 0 ? (
            <p className="text-sm text-muted">لا توجد اعتمادات مسجّلة.</p>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>الدور</TH>
                  <TH>الاسم</TH>
                </tr>
              </THead>
              <TBody>
                {work.credits.map((credit) => (
                  <TR key={credit.id}>
                    <TD className="text-muted">{CREDIT_ROLE_AR[credit.role] ?? credit.role}</TD>
                    <TD className="font-medium">{credit.name}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-foreground">الارتباط</h2>
        </CardHeader>
        <CardBody>
          {annex && contract && client ? (
            <dl className="grid gap-3 sm:grid-cols-3 text-sm">
              <div className="space-y-0.5">
                <dt className="text-muted">العميل</dt>
                <dd>
                  <Link href={`/clients/${String(client.id)}`} className="rounded text-gold-200 hover:underline focus-ring">
                    {clientName}
                  </Link>
                </dd>
              </div>
              <div className="space-y-0.5">
                <dt className="text-muted">العقد</dt>
                <dd>
                  <Link href={`/contracts/${String(contract.id)}`} className="rounded text-gold-200 hover:underline focus-ring">
                    {grantLabel}
                  </Link>
                </dd>
              </div>
              <div className="space-y-0.5">
                <dt className="text-muted">الملحق</dt>
                <dd className="text-foreground">ملحق رقم {annex.number}</dd>
              </div>
            </dl>
          ) : (
            <EmptyState title="غير مرتبط بملحق" body="هذا العمل غير مرتبط بأي ملحق أو عقد بعد." />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h2 className="text-base font-semibold text-foreground">النشاط</h2></CardHeader>
        <CardBody>
          <ActivityPanel
            entity="Work"
            entityId={id}
            path={`/works/${id}`}
            activity={panel.activity}
            comments={panel.comments}
            isAdmin={panel.isAdmin}
          />
        </CardBody>
      </Card>
    </section>
  )
}

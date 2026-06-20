import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { listWorks } from '@/services/works'
import { FadeIn } from '@/components/motion'
import { Breadcrumb, Table, THead, TBody, TR, TH, TD, Badge, EmptyState, statusVariant, IconWorks } from '@/components/ui'
import { WORK_STATUS_AR, CREDIT_ROLE_AR } from '@/lib/labels'

export const metadata = {
  title: 'الأعمال | Lumina Waves',
}

export const dynamic = 'force-dynamic'

/**
 * Flat list of all works (RSC). Each row links to the focused work detail page.
 */
export default async function WorksPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const works = await listWorks()

  return (
    <section className="space-y-8">
      <Breadcrumb items={[{ label: 'نظرة عامة', href: '/overview' }, { label: 'الأعمال' }]} />

      <FadeIn>
        <header className="border-b border-line pb-5">
          <h1 className="font-display text-3xl font-semibold text-gold-metallic">الأعمال</h1>
          <p className="mt-1 text-sm text-muted">
            {works.length > 0 ? `${works.length} عمل مسجّل` : 'إدارة أعمال لومينا ويفز'}
          </p>
        </header>
      </FadeIn>

      {works.length === 0 ? (
        <EmptyState
          icon={<IconWorks className="h-6 w-6" />}
          title="لا توجد أعمال بعد"
          body="ستظهر الأعمال الموسيقية هنا بعد إضافتها."
        />
      ) : (
        <FadeIn delay={0.05}>
          <Table>
            <THead>
              <tr>
                <TH>العمل</TH>
                <TH>العميل / الملحق</TH>
                <TH>الاعتمادات</TH>
                <TH>الحالة</TH>
              </tr>
            </THead>
            <TBody>
              {works.map((work) => {
                const client = work.annex?.contract?.client
                const clientName = client ? client.stageName ?? client.legalName : null
                const context = clientName
                  ? `${clientName}${work.annex ? ` · ملحق ${work.annex.number}` : ''}`
                  : '—'
                const credits = work.credits.map((c) => CREDIT_ROLE_AR[c.role] ?? c.role).join('، ')
                return (
                  <TR key={work.id} href={`/works/${work.id}`}>
                    <TD className="font-medium">{work.title}</TD>
                    <TD className="text-muted">{context}</TD>
                    <TD className="text-muted">{credits || '—'}</TD>
                    <TD className="relative z-10">
                      <Badge variant={statusVariant(work.status)}>
                        {WORK_STATUS_AR[work.status] ?? work.status}
                      </Badge>
                    </TD>
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

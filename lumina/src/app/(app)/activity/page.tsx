import Link from 'next/link'
import { redirect } from 'next/navigation'
import { loadSession } from '@/lib/session'
import { can } from '@/lib/authz'
import { listGlobalActivity } from '@/services/activity'
import { FadeIn } from '@/components/motion'
import { Breadcrumb, Card, CardBody, buttonClasses } from '@/components/ui'
import { HistoryList } from '@/components/activity/HistoryList'

export const metadata = { title: 'النشاط | Lumina Waves' }
export const dynamic = 'force-dynamic'

const ENTITY_FILTERS: Array<{ value: string; label: string }> = [
  { value: '', label: 'كل الأنواع' },
  { value: 'Client', label: 'العملاء' },
  { value: 'MasterContract', label: 'العقود' },
  { value: 'Work', label: 'الأعمال' },
  { value: 'Document', label: 'المستندات' },
  { value: 'User', label: 'المستخدمون' },
]

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; before?: string }>
}) {
  const s = await loadSession()
  if (!s) redirect('/login')
  if (!can(s.role, 'read', 'User')) redirect('/overview') // global feed is ADMIN-only

  const { entity, before } = await searchParams
  const beforeDate = before ? new Date(before) : undefined
  const { items, nextBefore } = await listGlobalActivity({
    entity: entity || undefined,
    before: beforeDate && !Number.isNaN(beforeDate.getTime()) ? beforeDate : undefined,
    take: 30,
  })

  const moreParams = new URLSearchParams()
  if (entity) moreParams.set('entity', entity)
  if (nextBefore) moreParams.set('before', nextBefore.toISOString())

  return (
    <section className="space-y-8">
      <Breadcrumb items={[{ label: 'نظرة عامة', href: '/overview' }, { label: 'النشاط' }]} />

      <FadeIn>
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
          <div className="space-y-1">
            <h1 className="font-display text-3xl font-semibold text-gold-metallic">سجل النشاط</h1>
            <p className="text-sm text-muted">كل ما جرى في النظام: من فعل ماذا ومتى.</p>
          </div>
          <form method="GET" className="flex items-center gap-2">
            <select
              name="entity"
              defaultValue={entity ?? ''}
              className="rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm text-foreground focus-ring"
            >
              {ENTITY_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <button type="submit" className={buttonClasses('secondary', 'sm')}>تصفية</button>
          </form>
        </header>
      </FadeIn>

      <FadeIn delay={0.05}>
        <Card>
          <CardBody>
            <HistoryList items={items} />
          </CardBody>
        </Card>
      </FadeIn>

      {nextBefore && (
        <div className="flex justify-center">
          <Link href={`/activity?${moreParams.toString()}`} className={buttonClasses('ghost')}>
            عرض الأقدم
          </Link>
        </div>
      )}
    </section>
  )
}

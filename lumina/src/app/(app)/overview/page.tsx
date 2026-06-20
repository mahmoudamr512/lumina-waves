import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { can } from '@/lib/authz'
import { db } from '@/lib/db'
import { Card, CardBody, buttonClasses, IconPlus, IconDocuments } from '@/components/ui'
import { FadeIn, Stagger, StaggerItem } from '@/components/motion'

export const metadata = { title: 'نظرة عامة | Lumina Waves' }
export const dynamic = 'force-dynamic'

interface Stat {
  label: string
  value: number
  href: string
}

/**
 * Dashboard landing for authenticated users. Shows record counts (only for the
 * entities the current role may read), quick actions, and the most recent
 * clients. Counts are non-sensitive aggregates; sensitive fields are never read
 * here.
 */
export default async function OverviewPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const role = session.user.role

  const [clients, contracts, works, documents, recentClients] = await Promise.all([
    can(role, 'read', 'Client') ? db.client.count() : Promise.resolve(null),
    can(role, 'read', 'MasterContract') ? db.masterContract.count() : Promise.resolve(null),
    can(role, 'read', 'Work') ? db.work.count() : Promise.resolve(null),
    can(role, 'read', 'Document') ? db.document.count() : Promise.resolve(null),
    can(role, 'read', 'Client')
      ? db.client.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, legalName: true, stageName: true, createdAt: true },
        })
      : Promise.resolve([]),
  ])

  const stats: Stat[] = [
    { label: 'العملاء', value: clients ?? -1, href: '/clients' },
    { label: 'العقود', value: contracts ?? -1, href: '/contracts' },
    { label: 'الأعمال', value: works ?? -1, href: '/works' },
    { label: 'المستندات', value: documents ?? -1, href: '/documents' },
  ].filter((s) => s.value >= 0)

  const canCreateClient = can(role, 'create', 'Client')

  return (
    <section className="space-y-10">
      <FadeIn>
        <header className="border-b border-line pb-5">
          <h1 className="font-display text-3xl font-semibold text-gold-metallic">نظرة عامة</h1>
          <p className="mt-1 text-sm text-muted">مرحبًا، {session.user.name ?? session.user.email}</p>
        </header>
      </FadeIn>

      <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4" stagger={0.06}>
        {stats.map((s) => (
          <StaggerItem key={s.href}>
            <Link href={s.href} className="block rounded-xl focus-ring">
              <Card interactive>
                <CardBody>
                  <p className="text-sm text-muted">{s.label}</p>
                  <p className="mt-2 font-display text-3xl font-semibold text-foreground tabular-nums">
                    {s.value}
                  </p>
                </CardBody>
              </Card>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">إجراءات سريعة</h2>
            <div className="flex flex-wrap gap-3">
              {canCreateClient && (
                <Link href="/clients/new" className={buttonClasses('primary', 'sm')}>
                  <IconPlus className="h-4 w-4" /> عميل جديد
                </Link>
              )}
              {can(role, 'create', 'Document') && (
                <Link href="/documents/upload" className={buttonClasses('secondary', 'sm')}>
                  <IconDocuments className="h-4 w-4" /> رفع مستند
                </Link>
              )}
            </div>
          </CardBody>
        </Card>

        {recentClients.length > 0 && (
          <Card>
            <CardBody className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground">أحدث العملاء</h2>
              <ul className="divide-y divide-line">
                {recentClients.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/clients/${c.id}`}
                      className="flex items-center justify-between gap-3 py-2.5 text-sm transition hover:text-gold-200 focus-ring"
                    >
                      <span className="truncate text-foreground">{c.stageName || c.legalName}</span>
                      <span className="shrink-0 text-xs text-subtle" dir="ltr">
                        {c.createdAt.toISOString().slice(0, 10)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )}
      </div>
    </section>
  )
}

import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { can } from '@/lib/authz'
import { db } from '@/lib/db'
import { search as searchDocs } from '@/lib/search'
import { FadeIn } from '@/components/motion'
import {
  Breadcrumb,
  Card,
  CardBody,
  Input,
  Button,
  EmptyState,
  IconSearch,
  IconClients,
  IconWorks,
  IconDocuments,
} from '@/components/ui'

export const metadata = {
  title: 'البحث | Lumina Waves',
}

export const dynamic = 'force-dynamic'

interface Hit {
  id: string
  title: string
  subtitle?: string
  href: string
}

interface Group {
  key: string
  label: string
  icon: React.ReactNode
  hits: Hit[]
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const role = session.user.role

  const { q } = await searchParams
  const query = q?.trim() ?? ''

  const groups: Group[] = []
  let searchError = false

  if (query) {
    const contains = { contains: query, mode: 'insensitive' as const }

    const [clientRows, workRows, docHits] = await Promise.all([
      can(role, 'read', 'Client')
        ? db.client.findMany({
            where: { OR: [{ legalName: contains }, { stageName: contains }] },
            take: 20,
            orderBy: { createdAt: 'desc' },
            select: { id: true, legalName: true, stageName: true },
          })
        : Promise.resolve([]),
      can(role, 'read', 'Work')
        ? db.work.findMany({
            where: { title: contains },
            take: 20,
            orderBy: { createdAt: 'desc' },
            include: { annex: { include: { contract: { include: { client: true } } } } },
          })
        : Promise.resolve([]),
      can(role, 'read', 'Document')
        ? searchDocs(query).catch(() => {
            searchError = true
            return []
          })
        : Promise.resolve([]),
    ])

    if (clientRows.length) {
      groups.push({
        key: 'clients',
        label: 'العملاء',
        icon: <IconClients className="h-4 w-4" />,
        hits: clientRows.map((c) => ({
          id: c.id,
          title: c.stageName ?? c.legalName,
          subtitle: c.stageName && c.stageName !== c.legalName ? c.legalName : undefined,
          href: `/clients/${c.id}`,
        })),
      })
    }

    if (workRows.length) {
      groups.push({
        key: 'works',
        label: 'الأعمال',
        icon: <IconWorks className="h-4 w-4" />,
        hits: workRows.map((w) => {
          const client = w.annex && !w.annex.deletedAt ? w.annex.contract?.client : null
          return {
            id: w.id,
            title: w.title,
            subtitle: client ? (client.stageName ?? client.legalName) : undefined,
            href: `/works/${w.id}`,
          }
        }),
      })
    }

    if (docHits.length) {
      groups.push({
        key: 'documents',
        label: 'المستندات',
        icon: <IconDocuments className="h-4 w-4" />,
        hits: docHits.map((d) => ({
          id: d.id,
          title: d.title,
          subtitle: d.clientName,
          href: `/documents/${d.id}`,
        })),
      })
    }
  }

  const totalHits = groups.reduce((n, g) => n + g.hits.length, 0)

  return (
    <section className="space-y-8">
      <Breadcrumb items={[{ label: 'نظرة عامة', href: '/overview' }, { label: 'البحث' }]} />

      <FadeIn>
        <header className="space-y-1 border-b border-line pb-5">
          <h1 className="font-display text-3xl font-semibold text-gold-metallic">البحث</h1>
          <p className="text-sm text-muted">ابحث في العملاء والأعمال والمستندات</p>
        </header>
      </FadeIn>

      <FadeIn delay={0.05}>
        <form method="GET" className="flex gap-3">
          <Input name="q" type="search" defaultValue={query} placeholder="ابحث في النظام…" aria-label="نص البحث" />
          <Button type="submit">بحث</Button>
        </form>
      </FadeIn>

      {searchError && totalHits === 0 && (
        <FadeIn delay={0.1}>
          <p role="alert" className="rounded-lg bg-warning/10 px-4 py-3 text-sm text-warning">
            تعذّر الوصول إلى فهرس المستندات حاليًا — قد تكون النتائج غير مكتملة.
          </p>
        </FadeIn>
      )}

      {query && totalHits === 0 && !searchError && (
        <FadeIn delay={0.1}>
          <EmptyState icon={<IconSearch className="h-6 w-6" />} title={`لم يُعثر على نتائج لـ «${query}»`} />
        </FadeIn>
      )}

      {totalHits > 0 && (
        <div className="space-y-8">
          {groups.map((group) => (
            <FadeIn key={group.key} delay={0.08}>
              <div className="space-y-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-subtle">
                  {group.icon}
                  {group.label}
                  <span className="text-subtle">({group.hits.length})</span>
                </h2>
                <ul className="space-y-3">
                  {group.hits.map((hit) => (
                    <li key={hit.id}>
                      <a href={hit.href} className="block rounded-xl focus-ring">
                        <Card interactive>
                          <CardBody>
                            <p className="font-medium text-foreground">{hit.title}</p>
                            {hit.subtitle && <p className="mt-0.5 text-xs text-muted">{hit.subtitle}</p>}
                          </CardBody>
                        </Card>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          ))}
        </div>
      )}

      {!query && (
        <FadeIn delay={0.1}>
          <EmptyState
            icon={<IconSearch className="h-6 w-6" />}
            title="ابدأ البحث"
            body="ابحث عن عميل أو عمل موسيقي أو مستند."
          />
        </FadeIn>
      )}
    </section>
  )
}

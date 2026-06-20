import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { search } from '@/lib/search'
import { FadeIn } from '@/components/motion'
import { Breadcrumb, Card, CardBody, EmptyState, Input, Button, IconSearch } from '@/components/ui'

export const metadata = {
  title: 'البحث | Lumina Waves',
}

export const dynamic = 'force-dynamic'

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { q } = await searchParams

  let hits: Array<{ id: string; title: string; clientName?: string }> = []
  let searchError = false

  if (q) {
    try {
      hits = await search(q)
    } catch {
      searchError = true
    }
  }

  return (
    <section className="space-y-8">
      <Breadcrumb items={[{ label: 'نظرة عامة', href: '/overview' }, { label: 'البحث' }]} />

      <FadeIn>
        <header className="space-y-1 border-b border-line pb-5">
          <h1 className="font-display text-3xl font-semibold text-gold-metallic">البحث</h1>
          <p className="text-sm text-muted">ابحث في المستندات المفهرسة</p>
        </header>
      </FadeIn>

      <FadeIn delay={0.05}>
        <form method="GET" className="flex gap-3">
          <Input name="q" type="search" defaultValue={q ?? ''} placeholder="ابحث في المستندات…" aria-label="نص البحث" />
          <Button type="submit">بحث</Button>
        </form>
      </FadeIn>

      {searchError && (
        <FadeIn delay={0.1}>
          <p role="alert" className="rounded-lg bg-warning/10 px-4 py-3 text-sm text-warning">
            خدمة البحث غير متاحة حاليًا. يُرجى المحاولة لاحقًا.
          </p>
        </FadeIn>
      )}

      {!searchError && q && hits.length === 0 && (
        <FadeIn delay={0.1}>
          <EmptyState icon={<IconSearch className="h-6 w-6" />} title={`لم يُعثر على نتائج لـ «${q}»`} />
        </FadeIn>
      )}

      {!searchError && hits.length > 0 && (
        <FadeIn delay={0.1}>
          <ul className="space-y-3">
            {hits.map((hit) => (
              <li key={hit.id}>
                <a href={`/documents/${hit.id}`} className="block rounded-xl focus-ring">
                  <Card interactive>
                    <CardBody>
                      <p className="font-medium text-foreground">{hit.title}</p>
                      {hit.clientName && <p className="mt-0.5 text-xs text-muted">{hit.clientName}</p>}
                    </CardBody>
                  </Card>
                </a>
              </li>
            ))}
          </ul>
        </FadeIn>
      )}

      {!q && !searchError && (
        <FadeIn delay={0.1}>
          <EmptyState icon={<IconSearch className="h-6 w-6" />} title="ابدأ البحث" body="أدخل مصطلح البحث أعلاه للبدء." />
        </FadeIn>
      )}
    </section>
  )
}

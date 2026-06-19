import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { search } from '@/lib/search'
import { FadeIn } from '@/components/motion'
import { LuminaWaveMark } from '@/components/brand'

export const metadata = {
  title: 'البحث | Lumina Waves',
}

export const dynamic = 'force-dynamic'

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
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
      <FadeIn>
        <header className="space-y-1 border-b border-border-elevation pb-5">
          <h1 className="font-display text-3xl font-semibold text-gold-metallic">البحث</h1>
          <p className="text-sm text-muted">ابحث في المستندات المفهرسة</p>
        </header>
      </FadeIn>

      <FadeIn delay={0.05}>
        <form method="GET" className="flex gap-3">
          <input
            name="q"
            type="search"
            defaultValue={q ?? ''}
            placeholder="ابحث في المستندات…"
            aria-label="نص البحث"
            className="flex-1 rounded-lg border border-border-elevation bg-ink px-3.5 py-3 text-foreground placeholder:text-muted/50 focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400"
          />
          <button
            type="submit"
            className="rounded-lg bg-gold-400 px-5 py-3 text-sm font-semibold text-ink transition hover:bg-gold-300 focus:outline-none focus:ring-2 focus:ring-gold-200"
          >
            بحث
          </button>
        </form>
      </FadeIn>

      {searchError && (
        <FadeIn delay={0.1}>
          <p role="alert" className="rounded-lg bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
            خدمة البحث غير متاحة حاليًا. يُرجى المحاولة لاحقًا.
          </p>
        </FadeIn>
      )}

      {!searchError && q && hits.length === 0 && (
        <FadeIn delay={0.1}>
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <LuminaWaveMark size={56} variant="gold" title="لا نتائج" />
            <p className="text-muted">لم يُعثر على نتائج لـ «{q}»</p>
          </div>
        </FadeIn>
      )}

      {!searchError && hits.length > 0 && (
        <FadeIn delay={0.1}>
          <ul className="divide-y divide-border-elevation rounded-2xl border border-border-elevation" role="list">
            {hits.map((hit) => (
              <li key={hit.id} className="px-5 py-4">
                <p className="font-medium text-foreground">{hit.title}</p>
                {hit.clientName && (
                  <p className="mt-0.5 text-xs text-muted">{hit.clientName}</p>
                )}
              </li>
            ))}
          </ul>
        </FadeIn>
      )}

      {!q && !searchError && (
        <FadeIn delay={0.1}>
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <LuminaWaveMark size={56} variant="gold" title="ابدأ البحث" />
            <p className="text-muted">أدخل مصطلح البحث أعلاه للبدء</p>
          </div>
        </FadeIn>
      )}
    </section>
  )
}

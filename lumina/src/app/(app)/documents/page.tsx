import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { can } from '@/lib/authz'
import { db } from '@/lib/db'
import { FadeIn } from '@/components/motion'
import { LuminaWaveMark } from '@/components/brand'

export const metadata = {
  title: 'المستندات | Lumina Waves',
}

export const dynamic = 'force-dynamic'

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'مسودة',
  EXECUTED: 'منفّذ',
}

export default async function DocumentsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const role = session.user.role
  const canCreate = can(role, 'create', 'Document')

  const documents = await db.document.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      filename: true,
      status: true,
      createdAt: true,
      // storagePath is intentionally excluded — never expose raw fs paths to UI
    },
  })

  return (
    <section className="space-y-8">
      <FadeIn>
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border-elevation pb-5">
          <div className="space-y-1">
            <h1 className="font-display text-3xl font-semibold text-gold-metallic">المستندات</h1>
            <p className="text-sm text-muted">
              {documents.length > 0
                ? `${documents.length} مستند`
                : 'إدارة مستندات لومينا ويفز'}
            </p>
          </div>
          {canCreate && (
            <Link
              href="/documents/upload"
              className="rounded-lg bg-gold-400 px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-gold-300 focus:outline-none focus:ring-2 focus:ring-gold-200"
            >
              رفع مستند
            </Link>
          )}
        </header>
      </FadeIn>

      {documents.length === 0 ? (
        <EmptyState canCreate={canCreate} />
      ) : (
        <FadeIn delay={0.1}>
          <ul className="divide-y divide-border-elevation rounded-2xl border border-border-elevation" role="list">
            {documents.map((doc) => (
              <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="space-y-0.5">
                  <p className="font-medium text-foreground">{doc.filename}</p>
                  <p className="text-xs text-muted">
                    {new Date(doc.createdAt).toLocaleDateString('ar-EG', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    doc.status === 'EXECUTED'
                      ? 'bg-gold-400/10 text-gold-200'
                      : 'bg-white/5 text-muted'
                  }`}
                >
                  {STATUS_LABELS[doc.status] ?? doc.status}
                </span>
              </li>
            ))}
          </ul>
        </FadeIn>
      )}
    </section>
  )
}

function EmptyState({ canCreate }: { canCreate: boolean }) {
  return (
    <FadeIn
      delay={0.1}
      className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-border-elevation py-20 text-center"
    >
      <LuminaWaveMark size={72} variant="gold" title="لا توجد مستندات" />
      <div className="space-y-1">
        <p className="text-lg font-medium text-foreground">لا توجد مستندات بعد</p>
        <p className="text-sm text-muted">ابدأ برفع أول مستند إلى النظام.</p>
      </div>
      {canCreate && (
        <Link
          href="/documents/upload"
          className="rounded-lg bg-gold-400 px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-gold-300 focus:outline-none focus:ring-2 focus:ring-gold-200"
        >
          رفع مستند
        </Link>
      )}
    </FadeIn>
  )
}

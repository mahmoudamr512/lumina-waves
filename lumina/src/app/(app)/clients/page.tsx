import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { can } from '@/lib/authz'
import { listClients } from '@/services/clients'
import { LuminaWaveMark } from '@/components/brand'
import { FadeIn } from '@/components/motion'
import { ClientsGrid, type ClientCard } from './ClientsGrid'

export const metadata = {
  title: 'العملاء | Lumina Waves',
}

// Always render fresh — clients change via Server Actions and we revalidate.
export const dynamic = 'force-dynamic'

/**
 * Clients list (RSC). Reads the session for RBAC, fetches the already
 * role-redacted client rows from the service, and renders a header + either a
 * tasteful empty state or an animated, responsive card grid. `nationalId` is
 * null for OPERATIONS/VIEWER and is rendered gracefully downstream.
 */
export default async function ClientsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const role = session.user.role
  const canCreate = can(role, 'create', 'Client')

  const clients = await listClients()
  // Narrow to exactly the shape the UI needs (service already redacted).
  const cards: ClientCard[] = clients.map((c) => ({
    id: c.id,
    legalName: c.legalName,
    stageName: c.stageName,
    nationalId: c.nationalId,
  }))

  return (
    <section className="space-y-8">
      <FadeIn>
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border-elevation pb-5">
          <div className="space-y-1">
            <h1 className="font-display text-3xl font-semibold text-gold-metallic">
              العملاء
            </h1>
            <p className="text-sm text-muted">
              {cards.length > 0
                ? `${cards.length} عميل مسجّل`
                : 'إدارة عملاء لومينا ويفز'}
            </p>
          </div>

          {canCreate && (
            <Link
              href="/clients/new"
              className="rounded-lg bg-gold-400 px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-gold-300 focus:outline-none focus:ring-2 focus:ring-gold-200"
            >
              عميل جديد
            </Link>
          )}
        </header>
      </FadeIn>

      {cards.length === 0 ? (
        <EmptyState canCreate={canCreate} />
      ) : (
        <ClientsGrid clients={cards} />
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
      <LuminaWaveMark size={72} variant="gold" title="لا يوجد عملاء" />
      <div className="space-y-1">
        <p className="text-lg font-medium text-foreground">لا يوجد عملاء بعد</p>
        <p className="text-sm text-muted">ابدأ بإضافة أول عميل إلى النظام.</p>
      </div>
      {canCreate && (
        <Link
          href="/clients/new"
          className="rounded-lg bg-gold-400 px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-gold-300 focus:outline-none focus:ring-2 focus:ring-gold-200"
        >
          عميل جديد
        </Link>
      )}
    </FadeIn>
  )
}

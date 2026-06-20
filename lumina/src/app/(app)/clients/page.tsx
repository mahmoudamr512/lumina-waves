import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { can } from '@/lib/authz'
import { listClients } from '@/services/clients'
import { Breadcrumb, buttonClasses, EmptyState, IconClients, IconPlus } from '@/components/ui'
import { FadeIn } from '@/components/motion'
import { type ClientCard } from './ClientsGrid'
import { ClientsBrowser } from './ClientsBrowser'

export const metadata = {
  title: 'العملاء | Lumina Waves',
}

// Always render fresh — clients change via Server Actions and we revalidate.
export const dynamic = 'force-dynamic'

/**
 * Clients list (RSC). Reads the session for RBAC, fetches the already
 * role-redacted client rows from the service, and renders a breadcrumb + header
 * + either an empty state or an animated, responsive card grid. `nationalId` is
 * null for OPERATIONS/VIEWER and is rendered gracefully downstream.
 */
export default async function ClientsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const role = session.user.role
  const canCreate = can(role, 'create', 'Client')

  const clients = await listClients()
  const cards: ClientCard[] = clients.map((c) => ({
    id: c.id,
    legalName: c.legalName,
    stageName: c.stageName,
    nationalId: c.nationalId,
  }))

  return (
    <section className="space-y-8">
      <Breadcrumb items={[{ label: 'نظرة عامة', href: '/overview' }, { label: 'العملاء' }]} />

      <FadeIn>
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
          <div className="space-y-1">
            <h1 className="font-display text-3xl font-semibold text-gold-metallic">العملاء</h1>
            <p className="text-sm text-muted">
              {cards.length > 0 ? `${cards.length} عميل مسجّل` : 'إدارة عملاء لومينا ويفز'}
            </p>
          </div>

          {canCreate && (
            <Link href="/clients/new" className={buttonClasses('primary')}>
              <IconPlus className="h-4 w-4" /> عميل جديد
            </Link>
          )}
        </header>
      </FadeIn>

      {cards.length === 0 ? (
        <EmptyState
          icon={<IconClients className="h-6 w-6" />}
          title="لا يوجد عملاء بعد"
          body="ابدأ بإضافة أول عميل إلى النظام."
          action={
            canCreate ? (
              <Link href="/clients/new" className={buttonClasses('primary')}>
                <IconPlus className="h-4 w-4" /> عميل جديد
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ClientsBrowser clients={cards} />
      )}
    </section>
  )
}

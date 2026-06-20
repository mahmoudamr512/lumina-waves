import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { can } from '@/lib/authz'
import { FadeIn } from '@/components/motion'
import { Breadcrumb } from '@/components/ui'
import { NewClientForm } from './NewClientForm'

export const metadata = {
  title: 'عميل جديد | Lumina Waves',
}

/**
 * Create-client screen. Server-side RBAC guard: roles that cannot create a
 * client are bounced back to the list (the service would also reject them, but
 * we fail fast and avoid showing a form they cannot submit).
 */
export default async function NewClientPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!can(session.user.role, 'create', 'Client')) {
    redirect('/clients')
  }

  return (
    <section className="mx-auto max-w-lg space-y-8">
      <Breadcrumb
        items={[
          { label: 'نظرة عامة', href: '/overview' },
          { label: 'العملاء', href: '/clients' },
          { label: 'عميل جديد' },
        ]}
      />

      <FadeIn>
        <header className="space-y-1 border-b border-line pb-5">
          <h1 className="font-display text-3xl font-semibold text-gold-metallic">عميل جديد</h1>
          <p className="text-sm text-muted">أدخل بيانات العميل لإضافته إلى النظام.</p>
        </header>
      </FadeIn>

      <FadeIn delay={0.1}>
        <NewClientForm />
      </FadeIn>
    </section>
  )
}

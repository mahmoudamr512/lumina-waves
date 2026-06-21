import { redirect } from 'next/navigation'
import { loadSession } from '@/lib/session'
import { can } from '@/lib/authz'
import { FadeIn } from '@/components/motion'
import { Breadcrumb } from '@/components/ui'
import { NewUserForm } from './NewUserForm'

export const metadata = { title: 'مستخدم جديد | Lumina Waves' }
export const dynamic = 'force-dynamic'

export default async function NewUserPage() {
  const s = await loadSession()
  if (!s) redirect('/login')
  if (!can(s.role, 'create', 'User')) redirect('/overview')

  return (
    <section className="space-y-8">
      <Breadcrumb
        items={[
          { label: 'نظرة عامة', href: '/overview' },
          { label: 'المستخدمون', href: '/users' },
          { label: 'مستخدم جديد' },
        ]}
      />
      <FadeIn>
        <header className="space-y-1 border-b border-line pb-5">
          <h1 className="font-display text-3xl font-semibold text-gold-metallic">مستخدم جديد</h1>
          <p className="text-sm text-muted">أنشئ حساب مستخدم وحدّد دوره.</p>
        </header>
      </FadeIn>
      <div className="max-w-lg">
        <NewUserForm />
      </div>
    </section>
  )
}

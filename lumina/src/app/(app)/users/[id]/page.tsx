import { redirect, notFound } from 'next/navigation'
import { loadSession } from '@/lib/session'
import { can } from '@/lib/authz'
import { getUser } from '@/services/users'
import { listSessionsForUser } from '@/services/sessions'
import { ROLE_LABELS } from '@/lib/arabic'
import { FadeIn } from '@/components/motion'
import { Breadcrumb, Card, CardHeader, CardBody, Badge } from '@/components/ui'
import { EditUserForm } from './_forms/EditUserForm'
import { UserStatusActions } from './_forms/UserStatusActions'
import { UserSessionsPanel } from './_forms/UserSessionsPanel'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const s = await loadSession()
  if (!s || !can(s.role, 'read', 'User')) return {}
  const u = await getUser(id)
  return { title: u ? `${u.name} | المستخدمون` : 'المستخدمون' }
}

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const s = await loadSession()
  if (!s) redirect('/login')
  if (!can(s.role, 'read', 'User')) redirect('/overview')

  const user = await getUser(id)
  if (!user) notFound()
  const sessions = await listSessionsForUser(id)

  return (
    <section className="space-y-8">
      <Breadcrumb
        items={[
          { label: 'نظرة عامة', href: '/overview' },
          { label: 'المستخدمون', href: '/users' },
          { label: user.name },
        ]}
      />

      <FadeIn>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-6">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-gold-400/10 text-base font-semibold text-gold-200">
              {user.avatarPath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/avatars/${user.id}`} alt="" className="h-full w-full object-cover" />
              ) : (
                user.name.trim().charAt(0) || '؟'
              )}
            </span>
            <div>
              <h1 className="font-display text-2xl font-semibold text-gold-metallic">{user.name}</h1>
              <p className="text-sm text-muted" dir="ltr">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="neutral">{ROLE_LABELS[user.role]}</Badge>
            {user.disabledAt ? <Badge variant="danger">معطّل</Badge> : <Badge variant="success">نشط</Badge>}
          </div>
        </header>
      </FadeIn>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><h2 className="text-base font-semibold text-foreground">الملف</h2></CardHeader>
          <CardBody>
            <EditUserForm
              user={{ id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role }}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h2 className="text-base font-semibold text-foreground">الحالة والإجراءات</h2></CardHeader>
          <CardBody>
            <UserStatusActions user={{ id: user.id, disabled: Boolean(user.disabledAt), hasAvatar: Boolean(user.avatarPath) }} />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader><h2 className="text-base font-semibold text-foreground">الجلسات</h2></CardHeader>
        <CardBody>
          <UserSessionsPanel userId={user.id} sessions={sessions} />
        </CardBody>
      </Card>
    </section>
  )
}

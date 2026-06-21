import { redirect } from 'next/navigation'
import { loadSession } from '@/lib/session'
import { getMyProfile } from '@/services/account'
import { listMySessions } from '@/services/sessions'
import { ROLE_LABELS } from '@/lib/arabic'
import { FadeIn } from '@/components/motion'
import { Breadcrumb, Card, CardHeader, CardBody, Badge } from '@/components/ui'
import { ProfileForm } from './_forms/ProfileForm'
import { PasswordForm } from './_forms/PasswordForm'
import { MySessionsPanel } from './_forms/MySessionsPanel'
import { vapidPublicKey, listMyDevices } from '@/lib/push'
import { PushToggle } from '@/components/notifications/PushToggle'
import { PushDevices } from '@/components/notifications/PushDevices'

export const metadata = { title: 'حسابي | Lumina Waves' }
export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const s = await loadSession()
  if (!s) redirect('/login')

  const profile = await getMyProfile()
  if (!profile) redirect('/login')
  const sessions = await listMySessions()
  const devices = await listMyDevices()

  return (
    <section className="space-y-8">
      <Breadcrumb items={[{ label: 'نظرة عامة', href: '/overview' }, { label: 'حسابي' }]} />

      <FadeIn>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
          <div className="space-y-1">
            <h1 className="font-display text-3xl font-semibold text-gold-metallic">حسابي</h1>
            <p className="text-sm text-muted">إدارة ملفك الشخصي وكلمة المرور وجلساتك.</p>
          </div>
          <Badge variant="neutral">{ROLE_LABELS[profile.role]}</Badge>
        </header>
      </FadeIn>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><h2 className="text-base font-semibold text-foreground">الملف الشخصي</h2></CardHeader>
          <CardBody>
            <ProfileForm
              profile={{
                id: profile.id,
                name: profile.name,
                email: profile.email,
                phone: profile.phone,
                hasAvatar: Boolean(profile.avatarPath),
              }}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h2 className="text-base font-semibold text-foreground">كلمة المرور</h2></CardHeader>
          <CardBody>
            <PasswordForm />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader><h2 className="text-base font-semibold text-foreground">الإشعارات</h2></CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-muted">
            فعّل إشعارات المتصفح لتصلك تنبيهات التعليقات والإشارات حتى عندما يكون التطبيق مغلقًا.
          </p>
          <PushToggle publicKey={vapidPublicKey()} />
          <div className="border-t border-line pt-3">
            <p className="mb-2 text-sm font-medium text-foreground">الأجهزة المفعّلة</p>
            <PushDevices devices={devices} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h2 className="text-base font-semibold text-foreground">جلساتي</h2></CardHeader>
        <CardBody>
          <MySessionsPanel sessions={sessions} />
        </CardBody>
      </Card>
    </section>
  )
}

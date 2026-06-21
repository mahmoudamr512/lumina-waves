import Link from 'next/link'
import { redirect } from 'next/navigation'
import { loadSession } from '@/lib/session'
import { listMyNotifications } from '@/services/notifications'
import { timeAgoAr } from '@/lib/labels'
import { FadeIn } from '@/components/motion'
import { Breadcrumb, Card, CardBody, EmptyState, IconBell } from '@/components/ui'
import { MarkAllReadButton } from './MarkAllReadButton'

export const metadata = { title: 'الإشعارات | Lumina Waves' }
export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const s = await loadSession()
  if (!s) redirect('/login')
  const items = await listMyNotifications({ take: 100 })

  return (
    <section className="space-y-8">
      <Breadcrumb items={[{ label: 'نظرة عامة', href: '/overview' }, { label: 'الإشعارات' }]} />

      <FadeIn>
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
          <div className="space-y-1">
            <h1 className="font-display text-3xl font-semibold text-gold-metallic">الإشعارات</h1>
            <p className="text-sm text-muted">تنبيهات التعليقات والإشارات على السجلات التي تتابعها.</p>
          </div>
          {items.some((n) => !n.readAt) && <MarkAllReadButton />}
        </header>
      </FadeIn>

      {items.length === 0 ? (
        <EmptyState icon={<IconBell className="h-6 w-6" />} title="لا توجد إشعارات" />
      ) : (
        <FadeIn delay={0.05}>
          <Card>
            <CardBody>
              <ul className="divide-y divide-line">
                {items.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={n.href}
                      className="flex items-start gap-2 py-3 transition hover:text-gold-200 focus-ring rounded"
                    >
                      {!n.readAt && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold-400" />}
                      <span className="min-w-0">
                        <span className="block text-sm text-foreground">{n.title}</span>
                        <span className="block truncate text-xs text-muted">{n.body}</span>
                        <span className="block text-[11px] text-subtle">{timeAgoAr(n.createdAt)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </FadeIn>
      )}
    </section>
  )
}

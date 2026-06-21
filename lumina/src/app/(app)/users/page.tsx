import Link from 'next/link'
import { redirect } from 'next/navigation'
import { loadSession } from '@/lib/session'
import { can } from '@/lib/authz'
import { listUsers } from '@/services/users'
import { ROLE_LABELS } from '@/lib/arabic'
import { formatDateAr } from '@/lib/labels'
import { FadeIn } from '@/components/motion'
import {
  Breadcrumb,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
  Badge,
  EmptyState,
  buttonClasses,
  IconUsers,
  IconPlus,
} from '@/components/ui'

export const metadata = { title: 'المستخدمون | Lumina Waves' }
export const dynamic = 'force-dynamic'

function Avatar({ id, name, hasAvatar }: { id: string; name: string; hasAvatar: boolean }) {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-gold-400/10 text-xs font-semibold text-gold-200">
      {hasAvatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/avatars/${id}`} alt="" className="h-full w-full object-cover" />
      ) : (
        name.trim().charAt(0) || '؟'
      )}
    </span>
  )
}

export default async function UsersPage() {
  const s = await loadSession()
  if (!s) redirect('/login')
  if (!can(s.role, 'read', 'User')) redirect('/overview')

  const users = await listUsers()

  return (
    <section className="space-y-8">
      <Breadcrumb items={[{ label: 'نظرة عامة', href: '/overview' }, { label: 'المستخدمون' }]} />

      <FadeIn>
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
          <div className="space-y-1">
            <h1 className="font-display text-3xl font-semibold text-gold-metallic">المستخدمون</h1>
            <p className="text-sm text-muted">
              {users.length > 0 ? `${users.length} مستخدم` : 'إدارة مستخدمي النظام'}
            </p>
          </div>
          <Link href="/users/new" className={buttonClasses('primary')}>
            <IconPlus className="h-4 w-4" /> مستخدم جديد
          </Link>
        </header>
      </FadeIn>

      {users.length === 0 ? (
        <EmptyState icon={<IconUsers className="h-6 w-6" />} title="لا يوجد مستخدمون" />
      ) : (
        <FadeIn delay={0.05}>
          <Table>
            <THead>
              <tr>
                <TH>الاسم</TH>
                <TH>البريد الإلكتروني</TH>
                <TH>الدور</TH>
                <TH>الحالة</TH>
                <TH>الجلسات النشطة</TH>
                <TH>تاريخ الإضافة</TH>
              </tr>
            </THead>
            <TBody>
              {users.map((u) => (
                <TR key={u.id} href={`/users/${u.id}`}>
                  <TD>
                    <span className="flex items-center gap-2.5">
                      <Avatar id={u.id} name={u.name} hasAvatar={Boolean(u.avatarPath)} />
                      <span className="font-medium text-foreground">{u.name}</span>
                    </span>
                  </TD>
                  <TD className="text-muted" dir="ltr">{u.email}</TD>
                  <TD><Badge variant="neutral">{ROLE_LABELS[u.role]}</Badge></TD>
                  <TD>
                    {u.disabledAt ? (
                      <Badge variant="danger">معطّل</Badge>
                    ) : (
                      <Badge variant="success">نشط</Badge>
                    )}
                  </TD>
                  <TD className="tabular-nums">{u._count.sessions}</TD>
                  <TD className="text-muted">{formatDateAr(u.createdAt)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </FadeIn>
      )}
    </section>
  )
}

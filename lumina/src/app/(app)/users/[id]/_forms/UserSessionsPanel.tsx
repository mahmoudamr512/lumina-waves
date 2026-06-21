'use client'

import { revokeOneSession, revokeAllSessions, type ActionState } from '../actions'
import { useActionToast } from '@/components/forms/useActionToast'
import { Table, THead, TBody, TR, TH, TD, Badge, Button, EmptyState, buttonClasses, IconLock } from '@/components/ui'
import { formatDateAr } from '@/lib/labels'

const initial: ActionState = { error: null }

export interface SessionRow {
  id: string
  ip: string | null
  userAgent: string | null
  createdAt: Date
  lastSeenAt: Date
  expiresAt: Date
  revokedAt: Date | null
}

function deviceLabel(ua: string | null): string {
  if (!ua) return 'جهاز غير معروف'
  if (/iphone|android|mobile/i.test(ua)) return 'هاتف محمول'
  if (/mac|windows|linux|x11/i.test(ua)) return 'متصفح حاسوب'
  return ua.slice(0, 40)
}

function status(s: SessionRow): { label: string; variant: 'success' | 'neutral' | 'danger' } {
  if (s.revokedAt) return { label: 'ملغاة', variant: 'danger' }
  if (s.expiresAt < new Date()) return { label: 'منتهية', variant: 'neutral' }
  return { label: 'نشطة', variant: 'success' }
}

export function UserSessionsPanel({ userId, sessions }: { userId: string; sessions: SessionRow[] }) {
  const revokeOne = useActionToast(revokeOneSession, initial, 'تم إنهاء الجلسة')
  const revokeAll = useActionToast(revokeAllSessions, initial, 'تم إنهاء كل الجلسات')
  const hasActive = sessions.some((s) => !s.revokedAt && s.expiresAt >= new Date())

  if (sessions.length === 0) {
    return <EmptyState icon={<IconLock className="h-6 w-6" />} title="لا توجد جلسات" />
  }

  return (
    <div className="space-y-4">
      {hasActive && (
        <form action={revokeAll.formAction} className="flex justify-end">
          <input type="hidden" name="id" value={userId} />
          <Button type="submit" variant="danger" loading={revokeAll.pending}>إنهاء كل الجلسات</Button>
        </form>
      )}
      {(revokeOne.state.error || revokeAll.state.error) && (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {revokeOne.state.error ?? revokeAll.state.error}
        </p>
      )}
      <Table>
        <THead>
          <tr>
            <TH>الجهاز</TH>
            <TH>عنوان IP</TH>
            <TH>آخر نشاط</TH>
            <TH>الحالة</TH>
            <TH>إجراء</TH>
          </tr>
        </THead>
        <TBody>
          {sessions.map((s) => {
            const st = status(s)
            const active = !s.revokedAt && s.expiresAt >= new Date()
            return (
              <TR key={s.id}>
                <TD className="font-medium">{deviceLabel(s.userAgent)}</TD>
                <TD className="text-muted" dir="ltr">{s.ip ?? '—'}</TD>
                <TD className="text-muted">{formatDateAr(s.lastSeenAt)}</TD>
                <TD><Badge variant={st.variant}>{st.label}</Badge></TD>
                <TD className="relative z-10">
                  {active ? (
                    <form action={revokeOne.formAction}>
                      <input type="hidden" name="id" value={userId} />
                      <input type="hidden" name="sessionId" value={s.id} />
                      <button type="submit" className={buttonClasses('ghost', 'sm')}>إنهاء</button>
                    </form>
                  ) : (
                    <span className="text-xs text-subtle">—</span>
                  )}
                </TD>
              </TR>
            )
          })}
        </TBody>
      </Table>
    </div>
  )
}

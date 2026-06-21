'use client'

import { revokeMySessionAction, revokeMyOtherSessionsAction, type ActionState } from '../actions'
import { useActionToast } from '@/components/forms/useActionToast'
import { Table, THead, TBody, TR, TH, TD, Badge, Button, buttonClasses } from '@/components/ui'
import { formatDateAr } from '@/lib/labels'

const initial: ActionState = { error: null }

export interface MySessionRow {
  id: string
  ip: string | null
  userAgent: string | null
  lastSeenAt: Date
  expiresAt: Date
  revokedAt: Date | null
  current: boolean
}

function deviceLabel(ua: string | null): string {
  if (!ua) return 'جهاز غير معروف'
  if (/iphone|android|mobile/i.test(ua)) return 'هاتف محمول'
  if (/mac|windows|linux|x11/i.test(ua)) return 'متصفح حاسوب'
  return ua.slice(0, 40)
}

export function MySessionsPanel({ sessions }: { sessions: MySessionRow[] }) {
  const revokeOne = useActionToast(revokeMySessionAction, initial, 'تم إنهاء الجلسة')
  const revokeOthers = useActionToast(revokeMyOtherSessionsAction, initial, 'تم تسجيل الخروج من الأجهزة الأخرى')
  const hasOtherActive = sessions.some((s) => !s.current && !s.revokedAt && s.expiresAt >= new Date())

  return (
    <div className="space-y-4">
      {hasOtherActive && (
        <form action={revokeOthers.formAction} className="flex justify-end">
          <Button type="submit" variant="secondary" loading={revokeOthers.pending}>
            تسجيل الخروج من الأجهزة الأخرى
          </Button>
        </form>
      )}
      {(revokeOne.state.error || revokeOthers.state.error) && (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {revokeOne.state.error ?? revokeOthers.state.error}
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
            const active = !s.revokedAt && s.expiresAt >= new Date()
            return (
              <TR key={s.id}>
                <TD className="font-medium">
                  {deviceLabel(s.userAgent)}
                  {s.current && <Badge variant="gold">هذا الجهاز</Badge>}
                </TD>
                <TD className="text-muted" dir="ltr">{s.ip ?? '—'}</TD>
                <TD className="text-muted">{formatDateAr(s.lastSeenAt)}</TD>
                <TD>
                  {s.revokedAt ? (
                    <Badge variant="danger">ملغاة</Badge>
                  ) : active ? (
                    <Badge variant="success">نشطة</Badge>
                  ) : (
                    <Badge variant="neutral">منتهية</Badge>
                  )}
                </TD>
                <TD className="relative z-10">
                  {active && !s.current ? (
                    <form action={revokeOne.formAction}>
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

'use client'

import { saveUser, type ActionState } from '../actions'
import { useActionToast } from '@/components/forms/useActionToast'
import { Button, Field, Input, Select } from '@/components/ui'
import type { Role } from '@/generated/prisma/client'

const ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'VIEWER', label: 'مشاهدة' },
  { value: 'FINANCE', label: 'مالية' },
  { value: 'OPERATIONS', label: 'تشغيل' },
  { value: 'LEGAL', label: 'قانوني' },
  { value: 'ADMIN', label: 'مدير النظام' },
]

const initial: ActionState = { error: null }

export function EditUserForm({
  user,
}: {
  user: { id: string; name: string; email: string; phone: string | null; role: Role }
}) {
  const { state, formAction, pending } = useActionToast(saveUser, initial, 'تم حفظ التعديلات')

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="id" value={user.id} />
      <Field label="الاسم" htmlFor="name" required>
        <Input id="name" name="name" type="text" required defaultValue={user.name} autoComplete="off" />
      </Field>
      <Field label="البريد الإلكتروني" htmlFor="email" required>
        <Input id="email" name="email" type="email" required dir="ltr" defaultValue={user.email} autoComplete="off" />
      </Field>
      <Field label="رقم الجوال" htmlFor="phone">
        <Input id="phone" name="phone" type="tel" dir="ltr" defaultValue={user.phone ?? ''} autoComplete="off" placeholder="اختياري" />
      </Field>
      <Field label="الدور" htmlFor="role" required>
        <Select id="role" name="role" defaultValue={user.role}>
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </Field>
      {state.error && (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2.5 text-sm text-danger">{state.error}</p>
      )}
      <Button type="submit" loading={pending}>{pending ? 'جارٍ الحفظ…' : 'حفظ التعديلات'}</Button>
    </form>
  )
}

'use client'

import { useEffect, useRef } from 'react'
import { changePassword, type ActionState } from '../actions'
import { useActionToast } from '@/components/forms/useActionToast'
import { Button, Field, Input } from '@/components/ui'

const initial: ActionState = { error: null }

export function PasswordForm() {
  const { state, formAction, pending } = useActionToast(changePassword, initial, 'تم تغيير كلمة المرور')
  const formRef = useRef<HTMLFormElement>(null)
  const cleared = useRef<ActionState | null>(null)
  useEffect(() => {
    if (state.ok && cleared.current !== state) {
      cleared.current = state
      formRef.current?.reset()
    }
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="space-y-5" noValidate>
      <Field label="كلمة المرور الحالية" htmlFor="current" required>
        <Input id="current" name="current" type="password" required autoComplete="current-password" />
      </Field>
      <Field label="كلمة المرور الجديدة" htmlFor="next" required hint="8 أحرف على الأقل.">
        <Input id="next" name="next" type="password" required minLength={8} autoComplete="new-password" />
      </Field>
      <Field label="تأكيد كلمة المرور" htmlFor="confirm" required>
        <Input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
      </Field>
      {state.error && <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2.5 text-sm text-danger">{state.error}</p>}
      <Button type="submit" loading={pending}>{pending ? 'جارٍ التغيير…' : 'تغيير كلمة المرور'}</Button>
    </form>
  )
}

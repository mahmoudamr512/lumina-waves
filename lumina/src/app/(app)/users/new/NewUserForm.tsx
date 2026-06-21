'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useRef, useState } from 'react'
import { addUser, type AddUserState } from './actions'
import { Button, Field, Input, Select, buttonClasses, useToast } from '@/components/ui'

const initialState: AddUserState = { error: null }

const ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'VIEWER', label: 'مشاهدة' },
  { value: 'FINANCE', label: 'مالية' },
  { value: 'OPERATIONS', label: 'تشغيل' },
  { value: 'LEGAL', label: 'قانوني' },
  { value: 'ADMIN', label: 'مدير النظام' },
]

export function NewUserForm() {
  const [state, formAction, pending] = useActionState(addUser, initialState)
  const router = useRouter()
  const { toast } = useToast()
  const handled = useRef<AddUserState | null>(null)
  const [showPw, setShowPw] = useState(false)

  useEffect(() => {
    if (state.ok && handled.current !== state) {
      handled.current = state
      toast({ title: 'تم إنشاء المستخدم', variant: 'success' })
      router.push('/users')
    }
  }, [state, toast, router])

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <Field label="الاسم" htmlFor="name" required>
        <Input id="name" name="name" type="text" required defaultValue={state.values?.name ?? ''} autoComplete="off" />
      </Field>

      <Field label="البريد الإلكتروني" htmlFor="email" required>
        <Input id="email" name="email" type="email" required dir="ltr" defaultValue={state.values?.email ?? ''} autoComplete="off" />
      </Field>

      <Field label="الدور" htmlFor="role" required>
        <Select id="role" name="role" defaultValue={state.values?.role ?? 'VIEWER'}>
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </Field>

      <Field label="كلمة المرور المبدئية" htmlFor="password" required hint="8 أحرف على الأقل.">
        <div className="flex gap-2">
          <Input id="password" name="password" type={showPw ? 'text' : 'password'} required minLength={8} autoComplete="new-password" className="flex-1" />
          <button type="button" onClick={() => setShowPw((v) => !v)} className={buttonClasses('ghost', 'sm')}>
            {showPw ? 'إخفاء' : 'إظهار'}
          </button>
        </div>
      </Field>

      {state.error && (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2.5 text-sm text-danger">{state.error}</p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" loading={pending}>{pending ? 'جارٍ الحفظ…' : 'إنشاء المستخدم'}</Button>
        <Link href="/users" className={buttonClasses('ghost')}>إلغاء</Link>
      </div>
    </form>
  )
}

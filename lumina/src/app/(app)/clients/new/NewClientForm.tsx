'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useRef } from 'react'
import { addClient, type AddClientState } from '../actions'
import { Button, Field, Input, buttonClasses, useToast } from '@/components/ui'

const initialState: AddClientState = { error: null }

/**
 * New-client form. Uses `useActionState` so server-validation errors render
 * in-place with the user's input preserved. On success (`state.ok`) it shows a
 * toast and navigates back to the clients list.
 */
export function NewClientForm() {
  const [state, formAction, pending] = useActionState(addClient, initialState)
  const router = useRouter()
  const { toast } = useToast()
  const handled = useRef<AddClientState | null>(null)

  useEffect(() => {
    if (state.ok && handled.current !== state) {
      handled.current = state
      toast({ title: 'تم حفظ العميل', variant: 'success' })
      router.push('/clients')
    }
  }, [state, toast, router])

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <Field label="الاسم القانوني" htmlFor="legalName" required>
        <Input
          id="legalName"
          name="legalName"
          type="text"
          required
          defaultValue={state.values?.legalName ?? ''}
          autoComplete="off"
          placeholder="الاسم الكامل كما في المستندات الرسمية"
        />
      </Field>

      <Field label="اسم الشهرة" htmlFor="stageName">
        <Input
          id="stageName"
          name="stageName"
          type="text"
          defaultValue={state.values?.stageName ?? ''}
          autoComplete="off"
          placeholder="اختياري"
        />
      </Field>

      <Field label="الرقم القومي" htmlFor="nationalId" required hint="يتكوّن من 14 رقمًا.">
        <Input
          id="nationalId"
          name="nationalId"
          type="text"
          required
          inputMode="numeric"
          pattern="\d{14}"
          maxLength={14}
          dir="ltr"
          defaultValue={state.values?.nationalId ?? ''}
          autoComplete="off"
          className="text-end font-mono tabular-nums"
          placeholder="14 رقمًا"
        />
      </Field>

      {state.error && (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2.5 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" loading={pending}>
          {pending ? 'جارٍ الحفظ…' : 'حفظ العميل'}
        </Button>
        <Link href="/clients" className={buttonClasses('ghost')}>
          إلغاء
        </Link>
      </div>
    </form>
  )
}

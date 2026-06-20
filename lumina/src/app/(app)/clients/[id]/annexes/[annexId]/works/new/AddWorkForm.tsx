'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useRef } from 'react'
import { addWork, type AddWorkState } from './actions'
import { Button, Field, Input, buttonClasses, useToast } from '@/components/ui'

const CREDIT_ROLES = [
  { value: 'PERFORMER', label: 'مطرب / مؤدّي' },
  { value: 'AUTHOR', label: 'مؤلف' },
  { value: 'COMPOSER', label: 'ملحن' },
  { value: 'ARRANGER', label: 'موزع' },
]

const initialState: AddWorkState = { error: null }

interface Props {
  clientId: string
  annexId: string
  /** Parent contract — where we return after a successful save. */
  contractId?: string
}

export default function AddWorkForm({ clientId, annexId, contractId }: Props) {
  const [state, formAction, pending] = useActionState(addWork, initialState)
  const router = useRouter()
  const { toast } = useToast()
  const handled = useRef<AddWorkState | null>(null)
  const returnHref = contractId ? `/contracts/${contractId}` : `/clients/${clientId}`

  useEffect(() => {
    if (state.ok && handled.current !== state) {
      handled.current = state
      toast({ title: 'تم حفظ العمل', variant: 'success' })
      router.push(returnHref)
    }
  }, [state, toast, router, returnHref])

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="annexId" value={annexId} />

      <Field label="عنوان الأغنية / العمل" htmlFor="title" required>
        <Input id="title" name="title" type="text" required placeholder="أدخل عنوان العمل" />
      </Field>

      <fieldset className="space-y-3">
        <legend className="block text-sm font-medium text-foreground">
          أصحاب الحقوق
          <span className="ms-1 text-xs font-normal text-muted">(اختياري)</span>
        </legend>
        <div className="space-y-2 rounded-lg border border-line bg-ink-soft p-3">
          {CREDIT_ROLES.map((roleOpt, i) => (
            <div key={roleOpt.value} className="grid grid-cols-5 items-center gap-3">
              <input type="hidden" name={`role_${i}`} value={roleOpt.value} />
              <span className="col-span-2 text-sm text-muted">{roleOpt.label}</span>
              <Input className="col-span-3" name={`name_${i}`} type="text" placeholder="الاسم" />
            </div>
          ))}
        </div>
      </fieldset>

      {state.error && (
        <p role="alert" className="rounded-lg border border-danger/20 bg-danger/10 px-4 py-2.5 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" loading={pending}>
          {pending ? 'جارٍ الحفظ…' : 'حفظ العمل'}
        </Button>
        <Link href={returnHref} className={buttonClasses('ghost')}>
          إلغاء
        </Link>
      </div>
    </form>
  )
}

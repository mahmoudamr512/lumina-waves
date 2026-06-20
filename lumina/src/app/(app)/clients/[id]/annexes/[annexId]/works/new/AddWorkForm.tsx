'use client'

import { useActionState } from 'react'
import { addWork, type AddWorkState } from './actions'
import { cn } from '@/lib/cn'

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
}

export default function AddWorkForm({ clientId, annexId }: Props) {
  const [state, formAction, pending] = useActionState(addWork, initialState)

  return (
    <form action={formAction} className="space-y-6" dir="rtl">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="annexId" value={annexId} />

      {/* Title */}
      <div className="space-y-1.5">
        <label htmlFor="title" className="block text-sm font-medium text-foreground">
          عنوان الأغنية / العمل <span className="text-red-400">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          placeholder="أدخل عنوان العمل"
          className={cn(
            'w-full rounded-lg border border-border-elevation bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted',
            'focus:outline-none focus:ring-2 focus:ring-gold-400/50',
          )}
        />
      </div>

      {/* Credits */}
      <fieldset className="space-y-3">
        <legend className="block text-sm font-medium text-foreground">
          أصحاب الحقوق
          <span className="mr-1 text-xs font-normal text-muted">(اختياري)</span>
        </legend>
        <div className="space-y-2 rounded-lg border border-border-elevation bg-surface/40 p-3">
          {CREDIT_ROLES.map((roleOpt, i) => (
            <div key={roleOpt.value} className="grid grid-cols-5 gap-3 items-center">
              <input type="hidden" name={`role_${i}`} value={roleOpt.value} />
              <span className="col-span-2 text-sm text-muted">{roleOpt.label}</span>
              <input
                name={`name_${i}`}
                type="text"
                placeholder="الاسم"
                className={cn(
                  'col-span-3 rounded-lg border border-border-elevation bg-surface px-3 py-1.5 text-sm text-foreground placeholder:text-muted',
                  'focus:outline-none focus:ring-2 focus:ring-gold-400/50',
                )}
              />
            </div>
          ))}
        </div>
      </fieldset>

      {/* Error */}
      {state.error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          {state.error}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <a
          href={`/clients/${clientId}`}
          className="text-sm text-muted transition hover:text-foreground"
        >
          إلغاء
        </a>
        <button
          type="submit"
          disabled={pending}
          className={cn(
            'rounded-lg bg-gold-400 px-5 py-2 text-sm font-semibold text-ink transition',
            'hover:bg-gold-200 focus:outline-none focus:ring-2 focus:ring-gold-400/50',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          {pending ? 'جارٍ الحفظ…' : 'حفظ العمل'}
        </button>
      </div>
    </form>
  )
}

'use client'

import { useActionState } from 'react'
import { addClient, type AddClientState } from '../actions'

const initialState: AddClientState = { error: null }

const inputClass =
  'w-full rounded-lg border border-border-elevation bg-ink px-3.5 py-3 text-foreground placeholder:text-muted/50 focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400'

/**
 * New-client form. Uses `useActionState` so server-validation errors returned
 * by `addClient` render in-place (with the user's input preserved) instead of
 * throwing. Client-side HTML validation (`required`, `pattern`, numeric input
 * mode) is a UX nicety; the server is authoritative.
 */
export function NewClientForm() {
  const [state, formAction, pending] = useActionState(addClient, initialState)

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="legalName" className="block text-sm font-medium text-muted">
          الاسم القانوني <span className="text-gold-400">*</span>
        </label>
        <input
          id="legalName"
          name="legalName"
          type="text"
          required
          defaultValue={state.values?.legalName ?? ''}
          autoComplete="off"
          className={inputClass}
          placeholder="الاسم الكامل كما في المستندات الرسمية"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="stageName" className="block text-sm font-medium text-muted">
          اسم الشهرة
        </label>
        <input
          id="stageName"
          name="stageName"
          type="text"
          defaultValue={state.values?.stageName ?? ''}
          autoComplete="off"
          className={inputClass}
          placeholder="اختياري"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="nationalId" className="block text-sm font-medium text-muted">
          الرقم القومي <span className="text-gold-400">*</span>
        </label>
        <input
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
          className={`${inputClass} text-end font-mono tabular-nums`}
          placeholder="14 رقمًا"
          aria-describedby="nationalId-hint"
        />
        <p id="nationalId-hint" className="text-xs text-muted">
          يتكوّن من 14 رقمًا.
        </p>
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold-400 px-4 py-3 text-sm font-semibold text-ink transition hover:bg-gold-300 focus:outline-none focus:ring-2 focus:ring-gold-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending && (
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-ink/40 border-t-ink motion-reduce:animate-none"
          />
        )}
        {pending ? 'جارٍ الحفظ…' : 'حفظ العميل'}
      </button>
    </form>
  )
}

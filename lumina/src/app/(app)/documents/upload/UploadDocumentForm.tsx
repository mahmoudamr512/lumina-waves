'use client'

import { useActionState } from 'react'
import { uploadDocumentAction, type UploadDocumentState } from './actions'

const initialState: UploadDocumentState = { error: null }

const inputClass =
  'w-full rounded-lg border border-border-elevation bg-ink px-3.5 py-3 text-foreground placeholder:text-muted/50 focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400'

export function UploadDocumentForm() {
  const [state, formAction, pending] = useActionState(uploadDocumentAction, initialState)

  return (
    <form action={formAction} className="space-y-6" encType="multipart/form-data" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="file" className="block text-sm font-medium text-muted">
          الملف <span className="text-gold-400">*</span>
        </label>
        <input
          id="file"
          name="file"
          type="file"
          required
          accept=".pdf,.png,.jpg,.jpeg,.tiff"
          className={inputClass}
          aria-describedby="file-hint"
        />
        <p id="file-hint" className="text-xs text-muted">
          الصيغ المدعومة: PDF، PNG، JPG، TIFF
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="contractId" className="block text-sm font-medium text-muted">
          رقم العقد (اختياري)
        </label>
        <input
          id="contractId"
          name="contractId"
          type="text"
          autoComplete="off"
          className={inputClass}
          placeholder="اتركه فارغًا إذا كان المستند غير مرتبط بعقد"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="annexId" className="block text-sm font-medium text-muted">
          رقم الملحق (اختياري)
        </label>
        <input
          id="annexId"
          name="annexId"
          type="text"
          autoComplete="off"
          className={inputClass}
          placeholder="اتركه فارغًا إذا كان المستند غير مرتبط بملحق"
        />
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
        {pending ? 'جارٍ الرفع…' : 'رفع المستند'}
      </button>
    </form>
  )
}

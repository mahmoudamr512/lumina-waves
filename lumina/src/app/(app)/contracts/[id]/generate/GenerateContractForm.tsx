'use client'

import { useActionState } from 'react'
import { generateContract, type GenerateContractState } from './actions'

interface Props {
  contractId: string
}

const initialState: GenerateContractState = { error: null }

/**
 * Triggers PDF generation for the given contract. Uses useActionState so that
 * server-side errors (AuthzError, not-found, etc.) surface as friendly Arabic
 * messages without ever exposing a stack trace. On success shows a download link.
 */
export function GenerateContractForm({ contractId }: Props) {
  const action = generateContract.bind(null, contractId)
  const [state, formAction, pending] = useActionState(action, initialState)

  if (state.docId) {
    return (
      <div className="rounded-xl border border-gold-400/30 bg-gold-400/5 p-5 space-y-3 text-center">
        <p className="text-sm text-gold-300 font-medium">
          تم إنشاء مسودة العقد بنجاح.
        </p>
        <a
          href={`/contracts/${contractId}/generate/${state.docId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-gold-400 px-4 py-2.5 text-sm font-semibold text-gold-300 transition hover:bg-gold-400/10 focus:outline-none focus:ring-2 focus:ring-gold-200"
        >
          تحميل مسودة PDF
        </a>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-muted">
        بالضغط على الزر أدناه، سيتم توليد ملف PDF للعقد وحفظه كمسودة. تأكّد من مراجعة
        البيانات أعلاه قبل المتابعة.
      </p>

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
        {pending ? 'جارٍ الإنشاء…' : 'إنشاء مسودة العقد'}
      </button>
    </form>
  )
}

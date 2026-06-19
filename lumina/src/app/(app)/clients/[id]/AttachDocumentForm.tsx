'use client'

import { useActionState } from 'react'
import { attachDocument, type AttachState } from './actions'
import { cn } from '@/lib/cn'

const initial: AttachState = { error: null }

interface Props {
  clientId: string
  contractId?: string
  annexId?: string
}

export default function AttachDocumentForm({ clientId, contractId, annexId }: Props) {
  const [state, formAction, pending] = useActionState(attachDocument, initial)

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="clientId" value={clientId} />
      {contractId && <input type="hidden" name="contractId" value={contractId} />}
      {annexId && <input type="hidden" name="annexId" value={annexId} />}
      <input
        type="file"
        name="file"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        className={cn(
          'text-xs text-muted file:mr-2 file:rounded file:border-0',
          'file:bg-white/10 file:px-2 file:py-1 file:text-xs file:font-medium file:text-gold-200',
          'file:cursor-pointer file:transition file:hover:bg-white/20',
        )}
      />
      <button
        type="submit"
        disabled={pending}
        className={cn(
          'rounded border border-border-elevation px-2.5 py-1 text-xs font-medium text-muted transition',
          'hover:border-gold-400/40 hover:text-gold-200 focus:outline-none focus:ring-1 focus:ring-gold-400/50',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        {pending ? 'جارٍ الرفع…' : 'إرفاق مستند'}
      </button>
      {state.error && (
        <span className="w-full text-xs text-red-400">{state.error}</span>
      )}
      {!state.error && state.error === null && (
        // success flash handled by revalidatePath re-render
        null
      )}
    </form>
  )
}

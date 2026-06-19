'use client'

import { useActionState } from 'react'
import { addAnnex, type AnnexState } from './actions'
import { cn } from '@/lib/cn'

const initial: AnnexState = { error: null }

interface Props {
  contractId: string
  clientId: string
}

export default function AddAnnexButton({ contractId, clientId }: Props) {
  const [state, formAction, pending] = useActionState(addAnnex, initial)

  return (
    <form action={formAction} className="inline-flex flex-col items-end gap-1">
      <input type="hidden" name="contractId" value={contractId} />
      <input type="hidden" name="clientId" value={clientId} />
      <button
        type="submit"
        disabled={pending}
        className={cn(
          'rounded-lg border border-border-elevation px-3 py-1.5 text-xs font-medium text-muted transition',
          'hover:border-gold-400/40 hover:text-gold-200 focus:outline-none focus:ring-2 focus:ring-gold-400/50',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        {pending ? 'جارٍ الإضافة…' : 'إضافة ملحق'}
      </button>
      {state.error && (
        <span className="text-xs text-red-400">{state.error}</span>
      )}
    </form>
  )
}

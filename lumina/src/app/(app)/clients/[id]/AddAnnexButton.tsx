'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { addAnnex, type AnnexState } from './actions'
import { Button, useToast } from '@/components/ui'

const initial: AnnexState = { error: null }

/**
 * Adds an annex to a contract. The annex has no user-entered fields (its date is
 * "now"), so this is a single action button rather than a dialog. On success it
 * toasts and refreshes; failures render inline.
 */
export default function AddAnnexButton({ contractId, clientId }: { contractId: string; clientId: string }) {
  const [state, formAction, pending] = useActionState(addAnnex, initial)
  const router = useRouter()
  const { toast } = useToast()
  const handled = useRef<AnnexState | null>(null)

  useEffect(() => {
    if (state.ok && handled.current !== state) {
      handled.current = state
      toast({ title: 'تمت إضافة الملحق', variant: 'success' })
      router.refresh()
    }
  }, [state, toast, router])

  return (
    <form action={formAction} className="inline-flex flex-col items-end gap-1">
      <input type="hidden" name="contractId" value={contractId} />
      <input type="hidden" name="clientId" value={clientId} />
      <Button type="submit" variant="secondary" size="sm" loading={pending}>
        {pending ? 'جارٍ الإضافة…' : 'إضافة ملحق'}
      </Button>
      {state.error && <span className="text-xs text-danger">{state.error}</span>}
    </form>
  )
}

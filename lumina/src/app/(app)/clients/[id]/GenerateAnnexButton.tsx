'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { generateAnnexDraft, type GenAnnexState } from './actions'
import { Button, useToast } from '@/components/ui'

const initial: GenAnnexState = { error: null }

/**
 * One-click prefilled annex PDF draft. The annex is fully populated from its
 * works + parent contract, so there are no fields — just a button. On success it
 * toasts and refreshes; the new DRAFT appears in the annex's documents list.
 */
export default function GenerateAnnexButton({ annexId, contractId }: { annexId: string; contractId: string }) {
  const [state, formAction, pending] = useActionState(generateAnnexDraft, initial)
  const router = useRouter()
  const { toast } = useToast()
  const handled = useRef<GenAnnexState | null>(null)

  useEffect(() => {
    if (state.ok && handled.current !== state) {
      handled.current = state
      toast({ title: 'تم إنشاء مسودة الملحق', variant: 'success' })
      router.refresh()
    }
  }, [state, toast, router])

  return (
    <form action={formAction} className="inline-flex flex-col items-end gap-1">
      <input type="hidden" name="annexId" value={annexId} />
      <input type="hidden" name="contractId" value={contractId} />
      <Button type="submit" variant="ghost" size="sm" loading={pending}>
        {pending ? 'جارٍ الإنشاء…' : 'إنشاء مسودة PDF'}
      </Button>
      {state.error && <span className="text-xs text-danger">{state.error}</span>}
    </form>
  )
}

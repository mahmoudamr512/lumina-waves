'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui'

export interface OkState {
  error: string | null
  /** True once the mutation succeeded — dialogs toast and close on this. */
  ok?: boolean
}

/**
 * Shared wiring for the client hub's modal quick-add forms. Binds a server
 * action via useActionState and, on success (`state.ok`), shows a success toast,
 * closes the dialog, and refreshes the route so the new row appears. The `ok`
 * flag is handled once per submission (tracked by state identity).
 */
export function useQuickAdd(
  action: (prev: OkState, fd: FormData) => Promise<OkState>,
  initial: OkState,
  successTitle: string,
) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(action, initial)
  const router = useRouter()
  const { toast } = useToast()
  const handled = useRef<OkState | null>(null)

  useEffect(() => {
    if (state.ok && handled.current !== state) {
      handled.current = state
      toast({ title: successTitle, variant: 'success' })
      setOpen(false)
      router.refresh()
    }
  }, [state, toast, router, successTitle])

  return { open, setOpen, state, formAction, pending }
}

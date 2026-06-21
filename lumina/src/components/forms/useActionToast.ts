'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui'

export interface OkState {
  error: string | null
  ok?: boolean
}

/**
 * Bind a server action via useActionState and, on success (`state.ok`), show a
 * success toast and refresh the route. Success is handled once per submission
 * (tracked by state identity). For inline (non-dialog) action forms.
 */
export function useActionToast(
  action: (prev: OkState, fd: FormData) => Promise<OkState>,
  initial: OkState,
  successTitle: string,
) {
  const [state, formAction, pending] = useActionState(action, initial)
  const router = useRouter()
  const { toast } = useToast()
  const handled = useRef<OkState | null>(null)

  useEffect(() => {
    if (state.ok && handled.current !== state) {
      handled.current = state
      toast({ title: successTitle, variant: 'success' })
      router.refresh()
    }
  }, [state, toast, router, successTitle])

  return { state, formAction, pending }
}

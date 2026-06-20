'use client'

import { useActionState, useEffect, useRef } from 'react'
import { generateContract, type GenerateContractState } from './actions'
import { Button, buttonClasses, useToast } from '@/components/ui'

interface Props {
  contractId: string
}

const initialState: GenerateContractState = { error: null }

/**
 * Triggers PDF generation for the given contract. Uses useActionState so that
 * server-side errors surface as friendly Arabic messages without exposing a
 * stack trace. On success it toasts and shows a download link.
 */
export function GenerateContractForm({ contractId }: Props) {
  const action = generateContract.bind(null, contractId)
  const [state, formAction, pending] = useActionState(action, initialState)
  const { toast } = useToast()
  const handled = useRef<string | null>(null)

  useEffect(() => {
    if (state.docId && handled.current !== state.docId) {
      handled.current = state.docId
      toast({ title: 'تم إنشاء مسودة العقد', variant: 'success' })
    }
  }, [state.docId, toast])

  if (state.docId) {
    return (
      <div className="space-y-3 rounded-xl border border-success/30 bg-success/5 p-5 text-center">
        <p className="text-sm font-medium text-success">تم إنشاء مسودة العقد بنجاح.</p>
        <a
          href={`/contracts/${contractId}/generate/${state.docId}`}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses('secondary')}
        >
          تحميل مسودة PDF
        </a>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-muted">
        بالضغط على الزر أدناه، سيتم توليد ملف PDF للعقد وحفظه كمسودة. تأكّد من مراجعة البيانات أعلاه قبل المتابعة.
      </p>

      {state.error && (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2.5 text-sm text-danger">
          {state.error}
        </p>
      )}

      <Button type="submit" loading={pending} className="w-full">
        {pending ? 'جارٍ الإنشاء…' : 'إنشاء مسودة العقد'}
      </Button>
    </form>
  )
}

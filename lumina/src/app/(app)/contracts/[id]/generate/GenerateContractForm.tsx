'use client'

import { useActionState, useEffect, useRef } from 'react'
import { generateContract, type GenerateContractState } from './actions'
import { Button, buttonClasses, useToast } from '@/components/ui'

interface Props {
  contractId: string
  /** True for SALE contracts — enables the tafweed / combined variants. */
  isSale?: boolean
}

const initialState: GenerateContractState = { error: null }

/**
 * Triggers PDF generation for the given contract. For a SALE contract the form
 * offers three variants (contract only / tafweed only / combined). For a
 * DISTRIBUTION contract the variant picker is hidden — only the contract PDF
 * is meaningful; annex-level tafweed is generated from the annex UI. Uses
 * useActionState so server-side errors surface as friendly Arabic messages.
 */
export function GenerateContractForm({ contractId, isSale = false }: Props) {
  const action = generateContract.bind(null, contractId)
  const [state, formAction, pending] = useActionState(action, initialState)
  const { toast } = useToast()
  const handled = useRef<string | null>(null)

  useEffect(() => {
    if (state.docId && handled.current !== state.docId) {
      handled.current = state.docId
      toast({ title: 'تم إنشاء المسودة', variant: 'success' })
    }
  }, [state.docId, toast])

  if (state.docId) {
    return (
      <div className="space-y-3 rounded-xl border border-success/30 bg-success/5 p-5 text-center">
        <p className="text-sm font-medium text-success">تم إنشاء المسودة بنجاح.</p>
        <a
          href={`/contracts/${contractId}/generate/${state.docId}`}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses('secondary')}
        >
          تحميل PDF
        </a>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-muted">
        بالضغط على الزر أدناه، سيتم توليد ملف PDF وحفظه كمسودة. تأكّد من مراجعة البيانات أعلاه قبل المتابعة.
      </p>

      {isSale && (
        <fieldset className="space-y-2">
          <legend className="mb-1 block text-sm font-medium text-foreground">نوع المستند</legend>
          <div className="grid gap-2 rounded-lg border border-line bg-ink-soft p-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg p-2 text-sm transition hover:bg-white/5">
              <input type="radio" name="variant" value="contract" defaultChecked className="mt-0.5 h-4 w-4 accent-gold-400" />
              <span>
                <span className="block text-foreground">العقد فقط</span>
                <span className="block text-xs text-muted">مستند عقد البيع والتنازل القياسي.</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg p-2 text-sm transition hover:bg-white/5">
              <input type="radio" name="variant" value="tafweed" className="mt-0.5 h-4 w-4 accent-gold-400" />
              <span>
                <span className="block text-foreground">الإقرار فقط</span>
                <span className="block text-xs text-muted">إقرار الطرف الأول ببيع وتنازل حقوق المصنفات (ملف PDF مستقل).</span>
              </span>
            </label>
          </div>
        </fieldset>
      )}

      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-line bg-ink-soft p-3 text-sm">
        <input type="checkbox" name="withSeal" value="true" defaultChecked className="h-4 w-4 accent-gold-400" />
        <span>
          <span className="block text-foreground">إضافة ختم الشركة</span>
          <span className="block text-xs text-muted">
            أزل العلامة للحصول على مسودة بدون ختم (مثلاً لتوقيع الطرف الأول قبل ختمها من الشركة).
          </span>
        </span>
      </label>

      {state.error && (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2.5 text-sm text-danger">
          {state.error}
        </p>
      )}

      <Button type="submit" loading={pending} className="w-full">
        {pending ? 'جارٍ الإنشاء…' : 'إنشاء المسودة'}
      </Button>
    </form>
  )
}

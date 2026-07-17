'use client'

import { useActionState, useEffect, useRef } from 'react'
import { generateContract, type GenerateContractState } from './actions'
import { Button, buttonClasses, useToast } from '@/components/ui'

interface Props {
  contractId: string
  /** True for SALE contracts — the click also emits the standalone ekrar. */
  isSale?: boolean
}

const initialState: GenerateContractState = { error: null }

/**
 * Triggers PDF generation for the given contract. One click produces the
 * contract draft AND (for SALE) the standalone ekrar as two SEPARATE PDFs
 * bundled together via a shared bundleId. Success state exposes a download
 * link for each so the user can grab both without leaving the page.
 */
export function GenerateContractForm({ contractId, isSale = false }: Props) {
  const action = generateContract.bind(null, contractId)
  const [state, formAction, pending] = useActionState(action, initialState)
  const { toast } = useToast()
  const handled = useRef<string | null>(null)

  useEffect(() => {
    if (state.contractDocId && handled.current !== state.contractDocId) {
      handled.current = state.contractDocId
      toast({
        title: state.ekrarDocId ? 'تم إنشاء العقد والإقرار' : 'تم إنشاء المسودة',
        variant: 'success',
      })
    }
  }, [state.contractDocId, state.ekrarDocId, toast])

  if (state.contractDocId) {
    return (
      <div className="space-y-3 rounded-xl border border-success/30 bg-success/5 p-5 text-center">
        <p className="text-sm font-medium text-success">
          {state.ekrarDocId ? 'تم إنشاء ملفَي العقد والإقرار.' : 'تم إنشاء المسودة بنجاح.'}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <a
            href={`/contracts/${contractId}/generate/${state.contractDocId}`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses('primary')}
          >
            تحميل العقد PDF
          </a>
          {state.ekrarDocId && (
            <a
              href={`/contracts/${contractId}/generate/${state.ekrarDocId}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses('secondary')}
            >
              تحميل الإقرار PDF
            </a>
          )}
        </div>
        {state.bundleId && (
          <p className="text-xs text-muted">
            الملفان مرتبطان بمجموعة توقيع واحدة (bundle: <span className="font-mono">{state.bundleId.slice(0, 8)}</span>).
          </p>
        )}
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-muted">
        {isSale
          ? 'بالضغط على الزر أدناه سيتم توليد ملفَين منفصلين: العقد + الإقرار (تقرير التنازل). كلاهما مرتبط بمجموعة توقيع واحدة.'
          : 'بالضغط على الزر أدناه، سيتم توليد ملف PDF للعقد وحفظه كمسودة. تأكّد من مراجعة البيانات أعلاه قبل المتابعة.'}
      </p>

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
        {pending ? 'جارٍ الإنشاء…' : isSale ? 'إنشاء العقد والإقرار' : 'إنشاء مسودة العقد'}
      </Button>
    </form>
  )
}

'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { addAnnex, type AnnexState } from './actions'
import { Button, Dialog, Field, useToast, buttonClasses } from '@/components/ui'

const initial: AnnexState = { error: null }

/**
 * Adds an annex to a contract. Opens a dialog with an optional Excel/CSV upload
 * — same 2-column format as the SALE contract's works upload. On upload, the
 * annex is auto-populated with the rows as Work + PERFORMER credits so the
 * annex PDF and the Tafweed pick them up automatically.
 */
export default function AddAnnexButton({ contractId, clientId }: { contractId: string; clientId: string }) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(addAnnex, initial)
  const router = useRouter()
  const { toast } = useToast()
  const handled = useRef<AnnexState | null>(null)

  useEffect(() => {
    if (state.ok && handled.current !== state) {
      handled.current = state
      const n = state.importedWorks ?? 0
      toast({
        title: n > 0 ? `تمت إضافة الملحق وتحميل ${n} من المصنفات` : 'تمت إضافة الملحق',
        variant: 'success',
      })
      setOpen(false)
      router.refresh()
    }
  }, [state, toast, router])

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        إضافة ملحق
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="إضافة ملحق">
        <form action={formAction} encType="multipart/form-data" className="space-y-5">
          <input type="hidden" name="contractId" value={contractId} />
          <input type="hidden" name="clientId" value={clientId} />

          <Field
            label="قائمة المصنفات (Excel أو CSV) — اختياري"
            htmlFor="worksFile"
            hint="عمودان: (1) اسم المؤدّي، (2) اسم المصنّف. يمكن تركه فارغًا وإضافة المصنفات لاحقًا."
          >
            <input
              id="worksFile"
              name="worksFile"
              type="file"
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              className="block w-full rounded-lg border border-line bg-ink-soft px-3 py-2 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-gold-400 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink hover:file:bg-gold-300"
            />
          </Field>

          {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}

          <div className="flex items-center gap-2">
            <Button type="submit" loading={pending}>{pending ? 'جارٍ الإضافة…' : 'حفظ الملحق'}</Button>
            <button type="button" onClick={() => setOpen(false)} className={buttonClasses('ghost')}>
              إلغاء
            </button>
          </div>
        </form>
      </Dialog>
    </>
  )
}

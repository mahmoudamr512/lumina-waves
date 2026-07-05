'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { generateAnnexDraft, type GenAnnexState } from './actions'
import { Button, Dialog, useToast, buttonClasses } from '@/components/ui'

const initial: GenAnnexState = { error: null }

/**
 * Annex PDF generation — opens a dialog with three variants (annex only /
 * tafweed only / combined) and a seal toggle. All variants generate a DRAFT
 * document attached to the annex; new DRAFT appears in the annex's documents.
 */
export default function GenerateAnnexButton({ annexId, contractId }: { annexId: string; contractId: string }) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(generateAnnexDraft, initial)
  const router = useRouter()
  const { toast } = useToast()
  const handled = useRef<GenAnnexState | null>(null)

  useEffect(() => {
    if (state.ok && handled.current !== state) {
      handled.current = state
      toast({ title: 'تم إنشاء مسودة PDF', variant: 'success' })
      setOpen(false)
      router.refresh()
    }
  }, [state, toast, router])

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        إنشاء مسودة PDF
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="إنشاء مسودة PDF للملحق">
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="annexId" value={annexId} />
          <input type="hidden" name="contractId" value={contractId} />

          <fieldset className="space-y-2">
            <legend className="mb-1 block text-sm font-medium text-foreground">نوع المستند</legend>
            <div className="grid gap-2 rounded-lg border border-line bg-ink-soft p-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg p-2 text-sm transition hover:bg-white/5">
                <input type="radio" name="variant" value="annex" defaultChecked className="mt-0.5 h-4 w-4 accent-gold-400" />
                <span>
                  <span className="block text-foreground">الملحق فقط</span>
                  <span className="block text-xs text-muted">مستند الملحق القياسي بجدول المصنفات وبنوده.</span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg p-2 text-sm transition hover:bg-white/5">
                <input type="radio" name="variant" value="tafweed" className="mt-0.5 h-4 w-4 accent-gold-400" />
                <span>
                  <span className="block text-foreground">التفويض والإقرار فقط</span>
                  <span className="block text-xs text-muted">مستند التفويض القائم بذاته الذي يوقّعه الطرف الأول.</span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg p-2 text-sm transition hover:bg-white/5">
                <input type="radio" name="variant" value="combined" className="mt-0.5 h-4 w-4 accent-gold-400" />
                <span>
                  <span className="block text-foreground">الملحق + التفويض (ملف واحد)</span>
                  <span className="block text-xs text-muted">صفحة الملحق وصفحة التفويض في ملف PDF واحد.</span>
                </span>
              </label>
            </div>
          </fieldset>

          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-line bg-ink-soft p-3 text-sm">
            <input type="checkbox" name="withSeal" value="true" defaultChecked className="h-4 w-4 accent-gold-400" />
            <span>
              <span className="block text-foreground">إضافة ختم الشركة</span>
              <span className="block text-xs text-muted">
                عند التفعيل، يظهر ختم لومينا ويفز أعلى توقيع الطرف الثاني. أزل العلامة للحصول على مسودة بدون ختم.
              </span>
            </span>
          </label>

          {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}

          <div className="flex items-center gap-2">
            <Button type="submit" loading={pending}>
              {pending ? 'جارٍ الإنشاء…' : 'إنشاء'}
            </Button>
            <button type="button" onClick={() => setOpen(false)} className={buttonClasses('ghost')}>
              إلغاء
            </button>
          </div>
        </form>
      </Dialog>
    </>
  )
}

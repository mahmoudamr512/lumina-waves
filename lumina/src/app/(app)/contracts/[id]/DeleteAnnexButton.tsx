'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { removeAnnex, hardRemoveAnnex, type DeleteState } from './actions'
import { Button, Dialog, buttonClasses, useToast } from '@/components/ui'

const initial: DeleteState = { error: null }

/** Admin-only annex delete: soft OR hard, the parent contract is untouched. */
export function DeleteAnnexButton({ annexId, annexNumber }: { annexId: string; annexNumber: number }) {
  const [open, setOpen] = useState(false)
  const [softState, softAction, softPending] = useActionState(removeAnnex, initial)
  const [hardState, hardAction, hardPending] = useActionState(hardRemoveAnnex, initial)
  const { toast } = useToast()
  const softHandled = useRef<DeleteState | null>(null)
  const hardHandled = useRef<DeleteState | null>(null)

  useEffect(() => {
    if (softState.ok && softHandled.current !== softState) {
      softHandled.current = softState
      setOpen(false)
      toast({ title: 'تم نقل الملحق إلى المحذوفات', variant: 'success' })
    }
  }, [softState, toast])

  useEffect(() => {
    if (hardState.ok && hardHandled.current !== hardState) {
      hardHandled.current = hardState
      setOpen(false)
      toast({ title: 'تم حذف الملحق نهائيًا', variant: 'success' })
    }
  }, [hardState, toast])

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        حذف الملحق
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title={`حذف الملحق رقم ${annexNumber}`}>
        <div className="space-y-5">
          <p className="text-sm text-muted">اختر طريقة الحذف. الحذف النهائي لا يمكن التراجع عنه.</p>

          <form action={softAction} className="space-y-3 rounded-lg border border-line p-4">
            <input type="hidden" name="id" value={annexId} />
            <div>
              <p className="text-sm font-medium text-foreground">نقل إلى المحذوفات</p>
              <p className="mt-1 text-xs text-muted">
                يمكن استرجاع الملحق وأعماله ومستنداته خلال <strong>٣ أيام</strong> من سلة المحذوفات.
              </p>
            </div>
            {softState.error && <p role="alert" className="text-sm text-danger">{softState.error}</p>}
            <Button type="submit" variant="secondary" loading={softPending}>نقل إلى المحذوفات</Button>
          </form>

          <form action={hardAction} className="space-y-3 rounded-lg border border-danger/40 p-4">
            <input type="hidden" name="id" value={annexId} />
            <div>
              <p className="text-sm font-medium text-danger">حذف نهائي</p>
              <p className="mt-1 text-xs text-muted">
                يُحذف الملحق وأعماله ومستنداته نهائيًا دون فترة استرجاع. يبقى العقد كما هو. لا يمكن التراجع عن هذا الإجراء.
              </p>
            </div>
            {hardState.error && <p role="alert" className="text-sm text-danger">{hardState.error}</p>}
            <Button type="submit" variant="danger" loading={hardPending}>حذف نهائي</Button>
          </form>

          <div>
            <button type="button" onClick={() => setOpen(false)} className={buttonClasses('ghost')}>
              إلغاء
            </button>
          </div>
        </div>
      </Dialog>
    </>
  )
}

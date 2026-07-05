'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { removeClient, hardRemoveClient, type DeleteClientState } from './actions'
import { Button, Dialog, buttonClasses, useToast } from '@/components/ui'

const initial: DeleteClientState = { error: null }

/** Admin-only delete flow: opens a modal offering soft-delete OR hard-delete. */
export function DeleteClientButton({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false)
  const [softState, softAction, softPending] = useActionState(removeClient, initial)
  const [hardState, hardAction, hardPending] = useActionState(hardRemoveClient, initial)
  const { toast } = useToast()
  const softHandled = useRef<DeleteClientState | null>(null)
  const hardHandled = useRef<DeleteClientState | null>(null)

  useEffect(() => {
    if (softState.ok && softHandled.current !== softState) {
      softHandled.current = softState
      toast({ title: 'تم نقل العميل إلى المحذوفات', variant: 'success' })
    }
  }, [softState, toast])

  useEffect(() => {
    if (hardState.ok && hardHandled.current !== hardState) {
      hardHandled.current = hardState
      toast({ title: 'تم حذف العميل نهائيًا', variant: 'success' })
    }
  }, [hardState, toast])

  return (
    <>
      <Button type="button" variant="danger" size="sm" onClick={() => setOpen(true)}>
        حذف العميل
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="حذف العميل">
        <div className="space-y-5">
          <p className="text-sm text-muted">
            اختر طريقة الحذف. سيؤثر الحذف على كل ما يخص العميل من عقود ومستندات وأعمال. الحذف النهائي لا يمكن التراجع عنه.
          </p>

          <form action={softAction} className="space-y-3 rounded-lg border border-line p-4">
            <input type="hidden" name="id" value={clientId} />
            <div>
              <p className="text-sm font-medium text-foreground">نقل إلى المحذوفات</p>
              <p className="mt-1 text-xs text-muted">
                يمكن استرجاع العميل خلال <strong>٣ أيام</strong> من سلة المحذوفات.
              </p>
            </div>
            {softState.error && <p role="alert" className="text-sm text-danger">{softState.error}</p>}
            <Button type="submit" variant="secondary" loading={softPending}>نقل إلى المحذوفات</Button>
          </form>

          <form action={hardAction} className="space-y-3 rounded-lg border border-danger/40 p-4">
            <input type="hidden" name="id" value={clientId} />
            <div>
              <p className="text-sm font-medium text-danger">حذف نهائي</p>
              <p className="mt-1 text-xs text-muted">
                يُحذف العميل نهائيًا دون فترة استرجاع. لا يمكن التراجع عن هذا الإجراء.
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

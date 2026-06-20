'use client'

import { attachDocument, type AttachState } from './actions'
import { Button, Dialog, Field, FileInput, buttonClasses } from '@/components/ui'
import { useQuickAdd } from './_forms/useQuickAdd'

const initial: AttachState = { error: null }

/**
 * Attach a document to a contract or an annex. `contextLabel` names the target
 * in the dialog title so the user knows exactly what they are attaching to.
 */
export default function AttachDocumentForm({
  clientId,
  contractId,
  annexId,
  contextLabel,
}: {
  clientId: string
  contractId?: string
  annexId?: string
  contextLabel?: string
}) {
  const { open, setOpen, state, formAction, pending } = useQuickAdd(attachDocument, initial, 'تم رفع المستند')

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClasses('ghost', 'sm')}>
        إرفاق مستند
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={contextLabel ? `إرفاق مستند — ${contextLabel}` : 'إرفاق مستند'}
      >
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="clientId" value={clientId} />
          {contractId && <input type="hidden" name="contractId" value={contractId} />}
          {annexId && <input type="hidden" name="annexId" value={annexId} />}
          <Field label="المستند" htmlFor="attach-file">
            <FileInput id="attach-file" name="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
          </Field>
          {state.error && (
            <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button type="submit" loading={pending}>
              {pending ? 'جارٍ الرفع…' : 'إرفاق'}
            </Button>
            <button type="button" onClick={() => setOpen(false)} className={buttonClasses('ghost', 'sm')}>
              إلغاء
            </button>
          </div>
        </form>
      </Dialog>
    </>
  )
}

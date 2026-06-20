'use client'

import { attachToFolder, type AttachState } from './actions'
import { Button, Dialog, Field, FileInput, buttonClasses } from '@/components/ui'
import { useQuickAdd } from './_forms/useQuickAdd'

const initial: AttachState = { error: null }

export default function FolderAttachForm({
  clientId,
  folderId,
  folderName,
}: {
  clientId: string
  folderId: string
  folderName?: string
}) {
  const { open, setOpen, state, formAction, pending } = useQuickAdd(attachToFolder, initial, 'تم رفع الملف')

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClasses('ghost', 'sm')}>
        إرفاق ملف
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={folderName ? `إرفاق ملف إلى «${folderName}»` : 'إرفاق ملف إلى المجلد'}
      >
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="clientId" value={clientId} />
          <input type="hidden" name="folderId" value={folderId} />
          <Field label="الملف" htmlFor="folder-file">
            <FileInput
              id="folder-file"
              name="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.mp3,.wav,.aiff"
            />
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

'use client'

import { addFolder, type FolderState } from './actions'
import { Button, Dialog, Field, Input, buttonClasses, IconPlus } from '@/components/ui'
import { useQuickAdd } from './_forms/useQuickAdd'

const initial: FolderState = { error: null }

export default function AddFolderForm({
  clientId,
  parentId,
  label,
}: {
  clientId: string
  parentId?: string
  label?: string
}) {
  const { open, setOpen, state, formAction, pending } = useQuickAdd(addFolder, initial, 'تم إنشاء المجلد')
  const title = parentId ? 'إنشاء مجلد فرعي' : 'إنشاء مجلد'

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClasses('secondary', 'sm')}>
        <IconPlus className="h-4 w-4" /> {label ?? 'إنشاء مجلد'}
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title={title}>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="clientId" value={clientId} />
          {parentId && <input type="hidden" name="parentId" value={parentId} />}
          <Field label="اسم المجلد" htmlFor="folder-name" required>
            <Input id="folder-name" name="name" required placeholder="اسم المجلد" />
          </Field>
          {state.error && (
            <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button type="submit" loading={pending}>
              {pending ? 'جارٍ الإنشاء…' : 'إنشاء'}
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

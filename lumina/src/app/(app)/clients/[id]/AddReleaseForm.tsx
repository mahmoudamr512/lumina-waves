'use client'

import { addRelease, type ReleaseState } from './actions'
import { Button, Dialog, Field, Input, Select, buttonClasses, IconPlus } from '@/components/ui'
import { RELEASE_TYPE_AR } from '@/lib/labels'
import { useQuickAdd } from './_forms/useQuickAdd'

const initial: ReleaseState = { error: null }

export default function AddReleaseForm({ clientId }: { clientId: string }) {
  const { open, setOpen, state, formAction, pending } = useQuickAdd(addRelease, initial, 'تمت إضافة الإصدار')

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClasses('secondary', 'sm')}>
        <IconPlus className="h-4 w-4" /> إضافة إصدار
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title="إضافة إصدار">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="clientId" value={clientId} />
          <Field label="عنوان الإصدار" htmlFor="release-title" required>
            <Input id="release-title" name="title" required placeholder="اسم الأغنية أو الألبوم" />
          </Field>
          <Field label="النوع" htmlFor="release-type">
            <Select id="release-type" name="type" defaultValue="SINGLE">
              {Object.entries(RELEASE_TYPE_AR).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="تاريخ الإصدار (اختياري)" htmlFor="release-date">
            <Input id="release-date" name="releaseDate" type="date" />
          </Field>
          {state.error && (
            <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button type="submit" loading={pending}>
              {pending ? 'جارٍ الحفظ…' : 'حفظ'}
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

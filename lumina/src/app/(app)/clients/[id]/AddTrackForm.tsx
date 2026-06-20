'use client'

import { addTrack, type TrackState } from './actions'
import { Button, Dialog, Field, Input, Select, buttonClasses, IconPlus } from '@/components/ui'
import { CREDIT_ROLE_AR } from '@/lib/labels'
import { useQuickAdd } from './_forms/useQuickAdd'

const initial: TrackState = { error: null }

export default function AddTrackForm({ releaseId, clientId }: { releaseId: string; clientId: string }) {
  const { open, setOpen, state, formAction, pending } = useQuickAdd(addTrack, initial, 'تمت إضافة المقطوعة')

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClasses('ghost', 'sm')}>
        <IconPlus className="h-4 w-4" /> إضافة مقطوعة
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title="إضافة مقطوعة/أغنية">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="releaseId" value={releaseId} />
          <input type="hidden" name="clientId" value={clientId} />
          <Field label="عنوان المقطوعة" htmlFor="track-title" required>
            <Input id="track-title" name="title" required placeholder="اسم الأغنية" />
          </Field>
          <Field label="الدور" htmlFor="track-role">
            <Select id="track-role" name="creditRole" defaultValue="PERFORMER">
              {Object.entries(CREDIT_ROLE_AR).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="الاسم (اختياري)" htmlFor="track-name">
            <Input id="track-name" name="creditName" placeholder="اسم الفنان" />
          </Field>
          {state.error && (
            <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button type="submit" loading={pending}>
              {pending ? 'جارٍ الإضافة…' : 'إضافة'}
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

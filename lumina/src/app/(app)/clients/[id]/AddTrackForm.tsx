'use client'

import { useActionState, useState } from 'react'
import { addTrack, type TrackState } from './actions'
import { cn } from '@/lib/cn'

const initial: TrackState = { error: null }

interface Props {
  releaseId: string
  clientId: string
}

const CREDIT_ROLE_AR: Record<string, string> = {
  AUTHOR: 'مؤلف',
  COMPOSER: 'ملحن',
  ARRANGER: 'موزع',
  PERFORMER: 'مطرب/مؤدّي',
  PRODUCER: 'منتج',
}

export default function AddTrackForm({ releaseId, clientId }: Props) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(addTrack, initial)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'rounded border border-border-elevation px-2 py-1 text-xs font-medium text-muted transition',
          'hover:border-gold-400/40 hover:text-gold-200 focus:outline-none',
        )}
      >
        + إضافة مقطوعة/أغنية
      </button>
    )
  }

  return (
    <form
      action={async (fd) => {
        await formAction(fd)
        if (!state.error) setOpen(false)
      }}
      className="flex flex-wrap items-end gap-2 rounded-lg border border-border-elevation bg-surface/30 p-2"
    >
      <input type="hidden" name="releaseId" value={releaseId} />
      <input type="hidden" name="clientId" value={clientId} />
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted">عنوان المقطوعة</label>
        <input
          name="title"
          required
          placeholder="اسم الأغنية"
          className={cn(
            'rounded border border-border-elevation bg-surface px-2 py-1 text-xs text-foreground',
            'placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-gold-400/50',
          )}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted">الدور</label>
        <select
          name="creditRole"
          className={cn(
            'rounded border border-border-elevation bg-surface px-2 py-1 text-xs text-foreground',
            'focus:outline-none focus:ring-1 focus:ring-gold-400/50',
          )}
        >
          {Object.entries(CREDIT_ROLE_AR).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted">الاسم</label>
        <input
          name="creditName"
          placeholder="اسم الفنان (اختياري)"
          className={cn(
            'rounded border border-border-elevation bg-surface px-2 py-1 text-xs text-foreground',
            'placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-gold-400/50',
          )}
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className={cn(
            'rounded bg-gold-400 px-2.5 py-1 text-xs font-semibold text-ink transition hover:bg-gold-200',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          {pending ? 'جارٍ الإضافة…' : 'إضافة'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-muted transition hover:text-foreground"
        >
          إلغاء
        </button>
      </div>
      {state.error && <span className="w-full text-xs text-red-400">{state.error}</span>}
    </form>
  )
}

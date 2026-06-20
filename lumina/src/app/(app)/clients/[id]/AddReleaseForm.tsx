'use client'

import { useActionState, useState } from 'react'
import { addRelease, type ReleaseState } from './actions'
import { cn } from '@/lib/cn'

const initial: ReleaseState = { error: null }

interface Props {
  clientId: string
}

const RELEASE_TYPE_AR: Record<string, string> = {
  SINGLE: 'أغنية منفردة',
  EP: 'EP',
  ALBUM: 'ألبوم',
}

export default function AddReleaseForm({ clientId }: Props) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(addRelease, initial)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'rounded-lg border border-border-elevation px-3 py-1.5 text-xs font-medium text-muted transition',
          'hover:border-gold-400/40 hover:text-gold-200 focus:outline-none focus:ring-2 focus:ring-gold-400/50',
        )}
      >
        + إضافة إصدار
      </button>
    )
  }

  return (
    <form
      action={async (fd) => {
        await formAction(fd)
        if (!state.error) setOpen(false)
      }}
      className="flex flex-wrap items-end gap-2 rounded-lg border border-border-elevation bg-surface/40 p-3"
    >
      <input type="hidden" name="clientId" value={clientId} />
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted">عنوان الإصدار</label>
        <input
          name="title"
          required
          placeholder="اسم الأغنية أو الألبوم"
          className={cn(
            'rounded border border-border-elevation bg-surface px-2.5 py-1.5 text-sm text-foreground',
            'placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-gold-400/50',
          )}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted">النوع</label>
        <select
          name="type"
          className={cn(
            'rounded border border-border-elevation bg-surface px-2.5 py-1.5 text-sm text-foreground',
            'focus:outline-none focus:ring-1 focus:ring-gold-400/50',
          )}
        >
          {Object.entries(RELEASE_TYPE_AR).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted">تاريخ الإصدار (اختياري)</label>
        <input
          name="releaseDate"
          type="date"
          className={cn(
            'rounded border border-border-elevation bg-surface px-2.5 py-1.5 text-sm text-foreground',
            'focus:outline-none focus:ring-1 focus:ring-gold-400/50',
          )}
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className={cn(
            'rounded-lg bg-gold-400 px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-gold-200',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          {pending ? 'جارٍ الحفظ…' : 'حفظ'}
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

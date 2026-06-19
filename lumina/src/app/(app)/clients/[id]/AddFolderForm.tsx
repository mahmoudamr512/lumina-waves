'use client'

import { useActionState, useState } from 'react'
import { addFolder, type FolderState } from './actions'
import { cn } from '@/lib/cn'

const initial: FolderState = { error: null }

interface Props {
  clientId: string
  parentId?: string
  label?: string
}

export default function AddFolderForm({ clientId, parentId, label }: Props) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(addFolder, initial)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'rounded-lg border border-border-elevation px-3 py-1.5 text-xs font-medium text-muted transition',
          'hover:border-gold-400/40 hover:text-gold-200 focus:outline-none focus:ring-2 focus:ring-gold-400/50',
        )}
      >
        {label ?? '+ إنشاء مجلد'}
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
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted">اسم المجلد</label>
        <input
          name="name"
          required
          placeholder="اسم المجلد"
          className={cn(
            'rounded border border-border-elevation bg-surface px-2.5 py-1.5 text-sm text-foreground',
            'placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-gold-400/50',
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
          {pending ? 'جارٍ الإنشاء…' : 'إنشاء'}
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

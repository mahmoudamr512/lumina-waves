'use client'

import { useActionState } from 'react'
import { attachToFolder, type AttachState } from './actions'
import { cn } from '@/lib/cn'

const initial: AttachState = { error: null }

interface Props {
  clientId: string
  folderId: string
}

export default function FolderAttachForm({ clientId, folderId }: Props) {
  const [state, formAction, pending] = useActionState(attachToFolder, initial)

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="folderId" value={folderId} />
      <input
        type="file"
        name="file"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.mp3,.wav,.aiff"
        className={cn(
          'text-xs text-muted file:mr-2 file:rounded file:border-0',
          'file:bg-white/10 file:px-2 file:py-1 file:text-xs file:font-medium file:text-gold-200',
          'file:cursor-pointer file:transition file:hover:bg-white/20',
        )}
      />
      <button
        type="submit"
        disabled={pending}
        className={cn(
          'rounded border border-border-elevation px-2.5 py-1 text-xs font-medium text-muted transition',
          'hover:border-gold-400/40 hover:text-gold-200 focus:outline-none focus:ring-1 focus:ring-gold-400/50',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        {pending ? 'جارٍ الرفع…' : 'إرفاق ملف'}
      </button>
      {state.error && <span className="w-full text-xs text-red-400">{state.error}</span>}
    </form>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { watchAction, unwatchAction } from './watch-actions'
import { buttonClasses } from '@/components/ui'

export function WatchToggle({
  entity,
  entityId,
  path,
  watching,
}: {
  entity: string
  entityId: string
  path: string
  watching: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function toggle() {
    setBusy(true)
    try {
      if (watching) await unwatchAction(entity, entityId, path)
      else await watchAction(entity, entityId, path)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={buttonClasses(watching ? 'ghost' : 'secondary', 'sm')}
    >
      {watching ? 'إلغاء المتابعة' : 'متابعة'}
    </button>
  )
}

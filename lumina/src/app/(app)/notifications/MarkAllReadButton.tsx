'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { markAllNotificationsRead } from '@/components/notifications/actions'
import { Button } from '@/components/ui'

export function MarkAllReadButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  return (
    <Button
      type="button"
      variant="secondary"
      loading={busy}
      onClick={async () => {
        setBusy(true)
        try {
          await markAllNotificationsRead()
          router.refresh()
        } finally {
          setBusy(false)
        }
      }}
    >
      تعليم الكل كمقروء
    </Button>
  )
}

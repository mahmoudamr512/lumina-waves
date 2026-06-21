'use client'

import { useState } from 'react'
import { enablePush } from '@/lib/push-client'
import { saveSubscription } from './actions'
import { Button, useToast } from '@/components/ui'

/**
 * Enables web push on the current device: requests permission, subscribes via
 * the service worker, and persists the subscription. `publicKey` is the VAPID
 * public key (null when push isn't configured on the server).
 */
export function PushToggle({ publicKey }: { publicKey: string | null }) {
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)

  if (!publicKey) {
    return <p className="text-sm text-muted">إشعارات المتصفح غير مُهيّأة على الخادم.</p>
  }

  async function onEnable() {
    setBusy(true)
    try {
      const res = await enablePush(publicKey!)
      if (!res.ok) {
        const msg =
          res.reason === 'denied'
            ? 'تم رفض إذن الإشعارات في المتصفح.'
            : res.reason === 'unsupported'
              ? 'هذا المتصفح لا يدعم الإشعارات (على iOS أضِف التطبيق إلى الشاشة الرئيسية أولًا).'
              : 'تعذّر تفعيل الإشعارات.'
        toast({ title: msg, variant: 'error' })
        return
      }
      await saveSubscription(res.subscription, typeof navigator !== 'undefined' ? navigator.userAgent : undefined)
      toast({ title: 'تم تفعيل إشعارات هذا الجهاز', variant: 'success' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button type="button" onClick={onEnable} loading={busy}>
      تفعيل إشعارات هذا الجهاز
    </Button>
  )
}

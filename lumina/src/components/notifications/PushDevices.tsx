'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { removeSubscription } from './actions'
import { buttonClasses } from '@/components/ui'
import { formatDateAr } from '@/lib/labels'

interface Device {
  id: string
  endpoint: string
  userAgent: string | null
  createdAt: Date | string
}

function label(ua: string | null): string {
  if (!ua) return 'جهاز'
  if (/iphone|ipad|android|mobile/i.test(ua)) return 'هاتف محمول'
  if (/mac|windows|linux|x11/i.test(ua)) return 'متصفح حاسوب'
  return ua.slice(0, 40)
}

export function PushDevices({ devices }: { devices: Device[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  if (devices.length === 0) return <p className="text-sm text-muted">لا توجد أجهزة مفعّلة.</p>
  return (
    <ul className="divide-y divide-line">
      {devices.map((d) => (
        <li key={d.id} className="flex items-center justify-between gap-3 py-2 text-sm">
          <span>
            <span className="text-foreground">{label(d.userAgent)}</span>{' '}
            <span className="text-xs text-subtle">· {formatDateAr(d.createdAt)}</span>
          </span>
          <button
            type="button"
            disabled={busy === d.id}
            onClick={async () => {
              setBusy(d.id)
              try {
                await removeSubscription(d.endpoint)
                router.refresh()
              } finally {
                setBusy(null)
              }
            }}
            className={buttonClasses('ghost', 'sm')}
          >
            إزالة
          </button>
        </li>
      ))}
    </ul>
  )
}

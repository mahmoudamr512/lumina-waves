'use client'

import { useState, useSyncExternalStore } from 'react'
import { enablePush } from '@/lib/push-client'
import { saveSubscription } from './actions'
import { Button, useToast } from '@/components/ui'

const DISMISS_KEY = 'lw-noti-dismissed'
const CHANGE_EVENT = 'lw-noti-change'

/**
 * Whether to show the enable-notifications nudge. Only when this browser can do
 * web push (so iOS Safari in-browser is excluded — it needs the installed PWA),
 * permission hasn't been decided yet, and the user hasn't dismissed. Returns a
 * boolean primitive → safe as a useSyncExternalStore snapshot.
 */
function computeShow(): boolean {
  if (typeof window === 'undefined') return false
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return false
  if (Notification.permission !== 'default') return false
  try {
    if (localStorage.getItem(DISMISS_KEY) === '1') return false
  } catch {
    /* localStorage blocked — show anyway */
  }
  return true
}

function subscribe(cb: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, cb)
  return () => window.removeEventListener(CHANGE_EVENT, cb)
}

/**
 * App-wide nudge to turn on browser push notifications. Renders nothing until
 * the user can actually enable them (and hasn't yet). Tapping "enable" triggers
 * the real browser permission prompt via enablePush(), then persists the
 * subscription. `publicKey` is the VAPID public key (null disables the prompt).
 */
export function NotificationPrompt({ publicKey }: { publicKey: string | null }) {
  const show = useSyncExternalStore(subscribe, computeShow, () => false)
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)

  if (!show || !publicKey) return null

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }

  const enable = async () => {
    setBusy(true)
    try {
      const res = await enablePush(publicKey)
      if (res.ok) {
        await saveSubscription(res.subscription, navigator.userAgent)
        toast({ title: 'تم تفعيل الإشعارات على هذا الجهاز', variant: 'success' })
      } else if (res.reason === 'denied') {
        toast({ title: 'تم رفض إذن الإشعارات في المتصفح', variant: 'error' })
        try {
          localStorage.setItem(DISMISS_KEY, '1')
        } catch {
          /* ignore */
        }
      } else {
        toast({ title: 'تعذّر تفعيل الإشعارات على هذا المتصفح', variant: 'error' })
      }
    } finally {
      setBusy(false)
      // Permission may have changed → re-evaluate (granted/denied hides the prompt).
      window.dispatchEvent(new Event(CHANGE_EVENT))
    }
  }

  return (
    <div
      role="region"
      aria-label="تفعيل الإشعارات"
      className="w-full rounded-xl border border-gold-400/30 bg-surface/80 p-4 backdrop-blur-sm"
    >
      <div className="flex items-start gap-3">
        <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold-400/10 text-gold-200">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 20a2 2 0 0 0 4 0" strokeLinecap="round" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">فعّل الإشعارات الفورية</p>
          <p className="mt-1 text-xs text-muted">
            استلم تنبيهات العقود والتعليقات والإشعارات لحظيًا — حتى عندما يكون التطبيق مغلقًا.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Button onClick={enable} size="sm" loading={busy}>
              تفعيل الإشعارات
            </Button>
            <Button onClick={dismiss} variant="ghost" size="sm">
              لاحقًا
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="إغلاق"
          className="shrink-0 rounded-md p-1 text-muted transition hover:bg-white/5 hover:text-foreground focus-ring"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}

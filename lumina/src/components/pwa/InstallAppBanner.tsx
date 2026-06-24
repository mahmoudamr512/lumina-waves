'use client'

import { useSyncExternalStore } from 'react'
import { Button } from '@/components/ui'

/** The Chromium `beforeinstallprompt` event (not in the standard lib types). */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'lw-install-dismissed'
const CHANGE_EVENT = 'lw-install-change'

type Mode = 'hidden' | 'ios' | 'android'

function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function getWindowPrompt(): BeforeInstallPromptEvent | undefined {
  return (window as unknown as { __lwInstallPrompt?: BeforeInstallPromptEvent }).__lwInstallPrompt
}

/**
 * What to show, computed from the live environment. Returns a primitive string
 * (stable across calls) so it's safe as a useSyncExternalStore snapshot.
 * Shows ONLY on a mobile browser that isn't installed and wasn't dismissed.
 */
function computeMode(): Mode {
  if (typeof window === 'undefined') return 'hidden'
  if (isStandalone()) return 'hidden' // already installed
  try {
    if (localStorage.getItem(DISMISS_KEY) === '1') return 'hidden'
  } catch {
    /* localStorage blocked — fall through */
  }
  const ua = navigator.userAgent || ''
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios' // no programmatic install on iOS
  if (/android/i.test(ua)) return getWindowPrompt() ? 'android' : 'hidden' // wait for the native prompt
  return 'hidden' // desktop
}

function subscribe(cb: () => void): () => void {
  // Re-evaluate whenever the install prompt becomes available, the app is
  // installed, or the user dismisses (a custom same-tab event).
  const events = ['lw-install-prompt-ready', 'beforeinstallprompt', 'appinstalled', CHANGE_EVENT]
  events.forEach((e) => window.addEventListener(e, cb))
  return () => events.forEach((e) => window.removeEventListener(e, cb))
}

/**
 * "Install the app" prompt on the login screen — mobile browser only. Android
 * gets the native install prompt (captured in RegisterSW), iOS gets Add-to-Home
 * instructions. Uses useSyncExternalStore so there's no setState-in-effect and
 * it hydrates cleanly (server snapshot = hidden).
 */
export function InstallAppBanner() {
  const mode = useSyncExternalStore<Mode>(subscribe, computeMode, () => 'hidden')

  if (mode === 'hidden') return null

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }

  const install = async () => {
    const prompt = getWindowPrompt()
    if (!prompt) return
    await prompt.prompt()
    await prompt.userChoice.catch(() => null)
    ;(window as unknown as { __lwInstallPrompt?: unknown }).__lwInstallPrompt = undefined
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }

  return (
    <div
      role="region"
      aria-label="تثبيت التطبيق"
      className="w-full max-w-sm rounded-xl border border-gold-400/30 bg-surface/80 p-4 backdrop-blur-sm"
    >
      <div className="flex items-start gap-3">
        <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold-400/10 text-gold-200">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 3v12m0 0 4-4m-4 4-4-4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">ثبّت تطبيق لومينا ويفز</p>
          {mode === 'ios' ? (
            <p className="mt-1 text-xs leading-relaxed text-muted">
              للتثبيت على iPhone: اضغط زر المشاركة (المربّع مع السهم لأعلى ↑) في شريط المتصفح، ثم اختر
              «إضافة إلى الشاشة الرئيسية».
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted">ثبّته على هاتفك للوصول الأسرع والإشعارات الفورية.</p>
          )}
          <div className="mt-3 flex items-center gap-2">
            {mode === 'android' && (
              <Button onClick={install} size="sm">
                تثبيت التطبيق
              </Button>
            )}
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

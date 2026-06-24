'use client'

import { useEffect } from 'react'

/**
 * Registers the service worker in all environments (needed for web push in dev
 * and CI as well as prod). Renders nothing.
 */
export function RegisterSW() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    const register = () => navigator.serviceWorker.register('/sw.js').catch(() => {})
    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register, { once: true })
  }, [])

  // Capture the Android/Chromium install prompt as early as possible (it can fire
  // before the login banner mounts). Stash it on window + announce it so
  // InstallAppBanner can surface a working "install" button regardless of timing.
  useEffect(() => {
    const onBip = (e: Event) => {
      e.preventDefault()
      ;(window as unknown as { __lwInstallPrompt?: Event }).__lwInstallPrompt = e
      window.dispatchEvent(new Event('lw-install-prompt-ready'))
    }
    window.addEventListener('beforeinstallprompt', onBip)
    return () => window.removeEventListener('beforeinstallprompt', onBip)
  }, [])

  return null
}

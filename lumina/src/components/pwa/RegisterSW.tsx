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
  return null
}

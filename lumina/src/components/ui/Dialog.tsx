'use client'

import { useEffect, useId, useRef, useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import { IconClose } from './icons'

const noopSubscribe = () => () => {}
/** True only after client mount — avoids portalling during SSR. */
function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  )
}

/**
 * Accessible modal dialog: portals to document.body, traps focus, closes on ESC
 * or overlay click, and locks body scroll while open. Direction (RTL/LTR) is
 * inherited from <html dir>. Callers own the `open` state.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  const t = useTranslations('ui')
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const mounted = useMounted()

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    const focusableSelector =
      'input, textarea, select, button, [href], [tabindex]:not([tabindex="-1"])'

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      // Trap Tab/Shift+Tab within the dialog so keyboard focus can't escape to
      // the (inert) background while the modal is open.
      if (e.key !== 'Tab') return
      const focusable = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
      ).filter((el) => !el.hasAttribute('disabled'))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const activeInPanel = panelRef.current?.contains(document.activeElement)
      if (e.shiftKey) {
        if (document.activeElement === first || !activeInPanel) {
          e.preventDefault()
          last.focus()
        }
      } else if (document.activeElement === last || !activeInPanel) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)

    // Move focus into the dialog.
    const focusTarget = panelRef.current?.querySelector<HTMLElement>(focusableSelector)
    focusTarget?.focus()

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
      previouslyFocused?.focus()
    }
  }, [open, onClose])

  if (!mounted || !open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-xl border border-line-strong bg-surface-raised shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold text-foreground">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="rounded-md p-1 text-muted transition hover:bg-white/5 hover:text-foreground focus-ring"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

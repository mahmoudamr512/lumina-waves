'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { IconBell } from '@/components/ui'
import { timeAgoAr } from '@/lib/labels'
import {
  fetchUnreadCount,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from './actions'

interface NotificationItem {
  id: string
  actorId: string | null
  type: string
  title: string
  body: string
  href: string
  readAt: Date | string | null
  createdAt: Date | string
}

export function NotificationBell({ initialCount }: { initialCount: number }) {
  const router = useRouter()
  const [count, setCount] = useState(initialCount)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Poll the unread count for near-real-time freshness (push covers instant).
  useEffect(() => {
    const t = setInterval(() => {
      fetchUnreadCount().then(setCount).catch(() => {})
    }, 30_000)
    return () => clearInterval(t)
  }, [])

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  async function toggle() {
    const next = !open
    setOpen(next)
    if (next) {
      setLoading(true)
      try {
        const rows = (await fetchNotifications()) as NotificationItem[]
        setItems(rows)
      } finally {
        setLoading(false)
      }
    }
  }

  async function openItem(it: NotificationItem) {
    if (!it.readAt) {
      await markNotificationRead(it.id).catch(() => {})
      setCount((c) => Math.max(0, c - 1))
    }
    setOpen(false)
    router.push(it.href)
  }

  async function markAll() {
    await markAllNotificationsRead().catch(() => {})
    setCount(0)
    setItems((rows) => rows.map((r) => ({ ...r, readAt: r.readAt ?? new Date().toISOString() })))
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={toggle}
        aria-label="الإشعارات"
        className="relative rounded-md p-2 text-muted transition hover:bg-white/5 hover:text-foreground focus-ring"
      >
        <IconBell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -end-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white tabular-nums">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full end-0 z-50 mb-2 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-line-strong bg-surface-raised shadow-2xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="text-sm font-semibold text-foreground">الإشعارات</span>
            <button type="button" onClick={markAll} className="text-xs text-gold-200 hover:underline focus-ring rounded">
              تعليم الكل كمقروء
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-center text-sm text-muted">جارٍ التحميل…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted">لا توجد إشعارات.</p>
            ) : (
              <ul className="divide-y divide-line">
                {items.map((it) => (
                  <li key={it.id}>
                    <button
                      type="button"
                      onClick={() => openItem(it)}
                      className="flex w-full items-start gap-2 px-4 py-3 text-start transition hover:bg-white/5 focus-ring"
                    >
                      {!it.readAt && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold-400" />}
                      <span className={it.readAt ? 'min-w-0' : 'min-w-0'}>
                        <span className="block text-sm text-foreground">{it.title}</span>
                        <span className="block truncate text-xs text-muted">{it.body}</span>
                        <span className="block text-[11px] text-subtle">{timeAgoAr(it.createdAt)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <a href="/notifications" className="block border-t border-line px-4 py-2.5 text-center text-xs text-gold-200 hover:underline focus-ring">
            عرض كل الإشعارات
          </a>
        </div>
      )}
    </div>
  )
}

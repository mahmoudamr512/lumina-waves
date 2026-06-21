'use server'

import { revalidatePath } from 'next/cache'
import { savePushSubscription, deletePushSubscription, type BrowserSubscription } from '@/lib/push'
import { markRead, markAllRead, listMyNotifications, unreadCount } from '@/services/notifications'

/** Persist a browser push subscription for the current user. */
export async function saveSubscription(sub: BrowserSubscription, userAgent?: string) {
  await savePushSubscription(sub, userAgent)
  revalidatePath('/account')
  return { ok: true }
}

export async function removeSubscription(endpoint: string) {
  await deletePushSubscription(endpoint)
  revalidatePath('/account')
  return { ok: true }
}

export async function markNotificationRead(id: string) {
  await markRead(id)
  return { ok: true }
}

export async function markAllNotificationsRead() {
  await markAllRead()
  return { ok: true }
}

export async function fetchNotifications() {
  return listMyNotifications({ take: 20 })
}

export async function fetchUnreadCount() {
  return unreadCount()
}

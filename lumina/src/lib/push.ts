import webpush from 'web-push'
import { db } from '@/lib/db'
import { loadSession } from '@/lib/session'
import { AuthzError } from '@/lib/errors'

let configuredFor = ''

/** Configure web-push lazily from env; returns false when VAPID isn't set. */
function ensureVapid(): boolean {
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:ops@luminawaves.com'
  if (!pub || !priv) return false
  const key = pub + priv
  if (configuredFor !== key) {
    webpush.setVapidDetails(subject, pub, priv)
    configuredFor = key
  }
  return true
}

/** Public VAPID key for the browser to subscribe with (null when unconfigured). */
export function vapidPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY ?? null
}

export interface PushPayload {
  title: string
  body: string
  url: string
}

/** Send a push to every device of a user. Best-effort; prunes dead subscriptions. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!ensureVapid()) return
  const subs = await db.pushSubscription.findMany({ where: { userId } })
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
        )
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) {
          await db.pushSubscription.delete({ where: { id: s.id } }).catch(() => {})
        } else {
          console.warn('[push] send failed:', err)
        }
      }
    }),
  )
}

async function me() {
  const s = await loadSession()
  if (!s) throw new AuthzError('UNAUTHENTICATED')
  return s
}

export interface BrowserSubscription {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export async function savePushSubscription(sub: BrowserSubscription, userAgent?: string) {
  const u = await me()
  await db.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: { userId: u.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent },
    update: { userId: u.id, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent },
  })
}

export async function deletePushSubscription(endpoint: string) {
  const u = await me()
  await db.pushSubscription.deleteMany({ where: { endpoint, userId: u.id } })
}

export async function listMyDevices() {
  const u = await me()
  return db.pushSubscription.findMany({
    where: { userId: u.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, userAgent: true, createdAt: true, endpoint: true },
  })
}

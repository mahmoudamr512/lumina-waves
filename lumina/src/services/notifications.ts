import { db } from '@/lib/db'
import { loadSession } from '@/lib/session'
import { AuthzError } from '@/lib/errors'
import { listWatcherIds } from '@/services/watchers'
import { sendPushToUser } from '@/lib/push'

export interface CreateForCommentInput {
  entity: string
  entityId: string
  commentId: string
  body: string
  actorId: string
  actorName: string
  entityLabel: string
  href: string
  mentionIds: string[]
}

/**
 * Fan a new comment out to recipients = (watchers ∪ mentions) − author.
 * One in-app Notification per recipient (MENTION wins for dedup); web push is
 * best-effort and never throws into the caller.
 */
export async function createForComment(i: CreateForCommentInput): Promise<void> {
  const watchers = await listWatcherIds(i.entity, i.entityId)
  const mention = new Set(i.mentionIds)
  const recipients = new Set<string>([...watchers, ...i.mentionIds])
  recipients.delete(i.actorId)
  if (recipients.size === 0) return

  const snippet = i.body.length > 140 ? i.body.slice(0, 140) + '…' : i.body
  const titleFor = (rid: string) =>
    mention.has(rid) ? `${i.actorName} ذكرك في «${i.entityLabel}»` : `${i.actorName} علّق على «${i.entityLabel}»`

  await db.notification.createMany({
    data: [...recipients].map((rid) => ({
      recipientId: rid,
      actorId: i.actorId,
      type: mention.has(rid) ? 'MENTION' : 'COMMENT',
      entity: i.entity,
      entityId: i.entityId,
      title: titleFor(rid),
      body: snippet,
      href: i.href,
    })),
  })

  await Promise.all(
    [...recipients].map((rid) =>
      sendPushToUser(rid, { title: titleFor(rid), body: snippet, url: i.href }).catch((e) =>
        console.warn('[notifications] push failed (best-effort):', e),
      ),
    ),
  )
}

async function me() {
  const s = await loadSession()
  if (!s) throw new AuthzError('UNAUTHENTICATED')
  return s
}

export async function unreadCount(): Promise<number> {
  const u = await me()
  return db.notification.count({ where: { recipientId: u.id, readAt: null } })
}

export async function listMyNotifications(opts?: { take?: number }) {
  const u = await me()
  return db.notification.findMany({
    where: { recipientId: u.id },
    orderBy: { createdAt: 'desc' },
    take: opts?.take ?? 30,
  })
}

export async function markRead(id: string) {
  const u = await me()
  await db.notification.updateMany({ where: { id, recipientId: u.id }, data: { readAt: new Date() } })
}

export async function markAllRead() {
  const u = await me()
  await db.notification.updateMany({ where: { recipientId: u.id, readAt: null }, data: { readAt: new Date() } })
}

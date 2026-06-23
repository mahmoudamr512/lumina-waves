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

export interface NotifyInput {
  recipientIds: string[]
  actorId?: string | null
  type: string
  entity: string
  entityId: string
  title: string
  body?: string
  href: string
}

/** Generic fan-out: dedup recipients, drop the actor, create in-app rows + best-effort push. */
export async function notify(i: NotifyInput): Promise<void> {
  const recipients = new Set(i.recipientIds.filter(Boolean))
  if (i.actorId) recipients.delete(i.actorId)
  if (recipients.size === 0) return
  const body = i.body ?? ''
  await db.notification.createMany({
    data: [...recipients].map((rid) => ({
      recipientId: rid,
      actorId: i.actorId ?? null,
      type: i.type,
      entity: i.entity,
      entityId: i.entityId,
      title: i.title,
      body,
      href: i.href,
    })),
  })
  await Promise.all(
    [...recipients].map((rid) =>
      sendPushToUser(rid, { title: i.title, body, url: i.href }).catch((e) =>
        console.warn('[notify] push failed (best-effort):', e),
      ),
    ),
  )
}

/** Notify a single user. */
export async function notifyUser(userId: string, i: Omit<NotifyInput, 'recipientIds'>): Promise<void> {
  await notify({ ...i, recipientIds: [userId] })
}

export async function listAdminIds(): Promise<string[]> {
  const rows = await db.user.findMany({
    where: { role: 'ADMIN', deletedAt: null, disabledAt: null },
    select: { id: true },
  })
  return rows.map((r) => r.id)
}

export async function listAdminLegalIds(): Promise<string[]> {
  const rows = await db.user.findMany({
    where: { role: { in: ['ADMIN', 'LEGAL'] }, deletedAt: null, disabledAt: null },
    select: { id: true },
  })
  return rows.map((r) => r.id)
}

/** Notify watchers of a record and its parent client about activity on it. */
export async function notifyRecordActivity(i: {
  entity: string
  entityId: string
  clientId?: string
  actorId: string
  title: string
  href: string
}): Promise<void> {
  const ids = new Set<string>(await listWatcherIds(i.entity, i.entityId))
  if (i.clientId) for (const x of await listWatcherIds('Client', i.clientId)) ids.add(x)
  await notify({
    recipientIds: [...ids],
    actorId: i.actorId,
    type: 'ACTIVITY',
    entity: i.entity,
    entityId: i.entityId,
    title: i.title,
    href: i.href,
  })
}

/** On soft-delete, notify the original creator (resolved from the CREATE audit row). */
export async function notifyCreatorOnDelete(
  entity: string,
  entityId: string,
  deleterId: string,
  label: string,
): Promise<void> {
  const row = await db.auditLog.findFirst({
    where: { entity, entityId, action: 'CREATE' },
    orderBy: { createdAt: 'asc' },
    select: { actorId: true },
  })
  const creator = row?.actorId
  if (!creator || creator === deleterId) return
  await notifyUser(creator, {
    type: 'TRASH',
    entity,
    entityId,
    title: `تم نقل «${label}» إلى المحذوفات`,
    href: '/overview',
  })
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

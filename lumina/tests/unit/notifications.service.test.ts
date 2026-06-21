import { vi, beforeEach } from 'vitest'

const { sendPushToUser } = vi.hoisted(() => ({ sendPushToUser: vi.fn() }))
vi.mock('@/lib/push', () => ({ sendPushToUser }))
vi.mock('@/lib/session', () => ({ loadSession: vi.fn() }))
// watchers (imported transitively) pulls in @/lib/auth → NextAuth (next/server) which can't load here.
vi.mock('@/lib/auth', () => ({ requireUser: vi.fn() }))

import { loadSession } from '@/lib/session'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { ensureWatching } from '@/services/watchers'
import { createForComment, unreadCount, listMyNotifications, markRead, markAllRead } from '@/services/notifications'

const mockLoadSession = loadSession as unknown as ReturnType<typeof vi.fn>
const RUN = Date.now().toString().slice(-6)
let seq = 0
const eid = () => `n-${RUN}-${seq++}`
const email = () => `ntf${seq++}.${RUN}@e.test`
async function mkUser() {
  return db.user.create({ data: { email: email(), name: 'N', role: 'VIEWER', passwordHash: await hashPassword('pw') } })
}

beforeEach(() => {
  sendPushToUser.mockReset()
  sendPushToUser.mockResolvedValue(undefined)
  mockLoadSession.mockReset()
})

test('createForComment notifies watchers ∪ mentions − author, dedups to MENTION, and pushes', async () => {
  const author = await mkUser()
  const watcherOnly = await mkUser()
  const mentionedWatcher = await mkUser()
  const entityId = eid()
  await ensureWatching(author.id, 'Client', entityId)
  await ensureWatching(watcherOnly.id, 'Client', entityId)
  await ensureWatching(mentionedWatcher.id, 'Client', entityId)

  await createForComment({
    entity: 'Client', entityId, commentId: 'c1', body: 'hello team',
    actorId: author.id, actorName: 'Author', entityLabel: 'Acme', href: '/clients/x?tab=activity',
    mentionIds: [mentionedWatcher.id],
  })

  const wRows = await db.notification.findMany({ where: { entity: 'Client', entityId } })
  // Author excluded; the other two notified.
  const recipientIds = wRows.map((r) => r.recipientId).sort()
  expect(recipientIds).toEqual([watcherOnly.id, mentionedWatcher.id].sort())
  // The mentioned watcher gets a single MENTION row (dedup).
  const mine = wRows.filter((r) => r.recipientId === mentionedWatcher.id)
  expect(mine.length).toBe(1)
  expect(mine[0].type).toBe('MENTION')
  expect(wRows.find((r) => r.recipientId === watcherOnly.id)?.type).toBe('COMMENT')
  expect(sendPushToUser).toHaveBeenCalledTimes(2)
})

test('unread/list/markRead/markAll are scoped to the caller', async () => {
  const a = await mkUser()
  const b = await mkUser()
  const entityId = eid()
  await db.notification.createMany({
    data: [
      { recipientId: a.id, type: 'COMMENT', entity: 'Client', entityId, title: 't', body: 'b', href: '/' },
      { recipientId: a.id, type: 'COMMENT', entity: 'Client', entityId, title: 't', body: 'b', href: '/' },
      { recipientId: b.id, type: 'COMMENT', entity: 'Client', entityId, title: 't', body: 'b', href: '/' },
    ],
  })
  mockLoadSession.mockResolvedValue({ id: a.id, role: 'VIEWER', sid: 's' })
  expect(await unreadCount()).toBe(2)
  const list = await listMyNotifications()
  expect(list.every((n) => n.recipientId === a.id)).toBe(true)
  await markRead(list[0].id)
  expect(await unreadCount()).toBe(1)
  await markAllRead()
  expect(await unreadCount()).toBe(0)
  // b's notification is untouched.
  mockLoadSession.mockResolvedValue({ id: b.id, role: 'VIEWER', sid: 's' })
  expect(await unreadCount()).toBe(1)
})

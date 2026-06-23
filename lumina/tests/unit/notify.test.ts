import { vi, beforeEach } from 'vitest'

const { sendPushToUser } = vi.hoisted(() => ({ sendPushToUser: vi.fn() }))
vi.mock('@/lib/push', () => ({ sendPushToUser }))
vi.mock('@/lib/auth', () => ({ requireUser: vi.fn() }))
vi.mock('@/lib/session', () => ({ loadSession: vi.fn() }))

import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { notify, notifyRecordActivity, listAdminIds } from '@/services/notifications'

const RUN = Date.now().toString().slice(-6)
let seq = 0
const eid = () => `nf-${RUN}-${seq++}`

beforeEach(() => {
  sendPushToUser.mockReset()
  sendPushToUser.mockResolvedValue(undefined)
})

test('notify dedups recipients and excludes the actor', async () => {
  const entityId = eid()
  await notify({
    recipientIds: ['u1', 'u2', 'u1', 'actor'],
    actorId: 'actor',
    type: 'ACTIVITY',
    entity: 'Client',
    entityId,
    title: 'تحديث',
    href: '/x',
  })
  const rows = await db.notification.findMany({ where: { entity: 'Client', entityId } })
  expect(rows.map((r) => r.recipientId).sort()).toEqual(['u1', 'u2'])
  expect(sendPushToUser).toHaveBeenCalledTimes(2)
})

test('notifyRecordActivity notifies record + client watchers, minus the actor', async () => {
  const entityId = eid()
  const clientId = eid()
  await db.watcher.create({ data: { userId: 'wa', entity: 'MasterContract', entityId } })
  await db.watcher.create({ data: { userId: 'wb', entity: 'Client', entityId: clientId } })
  await db.watcher.create({ data: { userId: 'actor', entity: 'Client', entityId: clientId } })
  await notifyRecordActivity({
    entity: 'MasterContract',
    entityId,
    clientId,
    actorId: 'actor',
    title: 'عقد جديد',
    href: `/contracts/${entityId}`,
  })
  const rows = await db.notification.findMany({ where: { entity: 'MasterContract', entityId } })
  expect(rows.map((r) => r.recipientId).sort()).toEqual(['wa', 'wb'])
})

test('listAdminIds includes an active admin', async () => {
  const admin = await db.user.create({
    data: { email: `adm${RUN}@e.test`, name: 'Adm', role: 'ADMIN', passwordHash: await hashPassword('pw') },
  })
  expect(await listAdminIds()).toContain(admin.id)
})

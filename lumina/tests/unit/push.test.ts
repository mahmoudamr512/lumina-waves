import { vi, beforeEach, afterEach } from 'vitest'

const { sendNotification, setVapidDetails } = vi.hoisted(() => ({
  sendNotification: vi.fn(),
  setVapidDetails: vi.fn(),
}))
vi.mock('web-push', () => ({ default: { setVapidDetails, sendNotification } }))
vi.mock('@/lib/session', () => ({ loadSession: vi.fn() }))

import { loadSession } from '@/lib/session'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { sendPushToUser, savePushSubscription } from '@/lib/push'

const mockLoadSession = loadSession as unknown as ReturnType<typeof vi.fn>
const RUN = Date.now().toString().slice(-6)
let seq = 0
const email = () => `psh${seq++}.${RUN}@e.test`
const endpoint = () => `https://push.example/${RUN}-${seq++}`

async function mkUser() {
  return db.user.create({ data: { email: email(), name: 'P', role: 'VIEWER', passwordHash: await hashPassword('pw') } })
}

const savedEnv = { ...process.env }
beforeEach(() => {
  sendNotification.mockReset()
  setVapidDetails.mockReset()
  mockLoadSession.mockReset()
  process.env.VAPID_PUBLIC_KEY = savedEnv.VAPID_PUBLIC_KEY ?? 'BNK18_Bte16xuC-AEgQFPO6CKyBB4enZgqviyACsS_iMGvlVkWypsyAIWZGPG2ZUVkW6oduuONQCBttHb7974AM'
  process.env.VAPID_PRIVATE_KEY = savedEnv.VAPID_PRIVATE_KEY ?? 'E0nW-4xwNs-q0NUy5jbLapj8HZrsh7qKDYR3PNWUSkM'
})
afterEach(() => {
  process.env.VAPID_PUBLIC_KEY = savedEnv.VAPID_PUBLIC_KEY
  process.env.VAPID_PRIVATE_KEY = savedEnv.VAPID_PRIVATE_KEY
})

test('savePushSubscription upserts by endpoint (no duplicate rows)', async () => {
  const u = await mkUser()
  mockLoadSession.mockResolvedValue({ id: u.id, role: 'VIEWER', sid: 's' })
  const ep = endpoint()
  await savePushSubscription({ endpoint: ep, keys: { p256dh: 'a', auth: 'b' } }, 'UA')
  await savePushSubscription({ endpoint: ep, keys: { p256dh: 'c', auth: 'd' } }, 'UA2')
  const rows = await db.pushSubscription.findMany({ where: { endpoint: ep } })
  expect(rows.length).toBe(1)
  expect(rows[0].p256dh).toBe('c')
})

test('sendPushToUser sends to each device and prunes on 410', async () => {
  const u = await mkUser()
  const ep = endpoint()
  await db.pushSubscription.create({ data: { userId: u.id, endpoint: ep, p256dh: 'a', auth: 'b' } })
  sendNotification.mockResolvedValueOnce(undefined)
  await sendPushToUser(u.id, { title: 't', body: 'b', url: '/' })
  expect(sendNotification).toHaveBeenCalledTimes(1)

  // Now simulate a gone subscription → pruned.
  sendNotification.mockRejectedValueOnce({ statusCode: 410 })
  await sendPushToUser(u.id, { title: 't', body: 'b', url: '/' })
  const left = await db.pushSubscription.count({ where: { endpoint: ep } })
  expect(left).toBe(0)
})

test('sendPushToUser is a no-op without VAPID env', async () => {
  delete process.env.VAPID_PUBLIC_KEY
  delete process.env.VAPID_PRIVATE_KEY
  const u = await mkUser()
  await db.pushSubscription.create({ data: { userId: u.id, endpoint: endpoint(), p256dh: 'a', auth: 'b' } })
  await sendPushToUser(u.id, { title: 't', body: 'b', url: '/' })
  expect(sendNotification).not.toHaveBeenCalled()
})

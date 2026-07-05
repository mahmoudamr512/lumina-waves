import { vi, beforeEach } from 'vitest'

const { sendPushToUser } = vi.hoisted(() => ({ sendPushToUser: vi.fn() }))
const { queueEmail } = vi.hoisted(() => ({ queueEmail: vi.fn() }))
vi.mock('@/lib/push', () => ({ sendPushToUser }))
vi.mock('@/lib/notify-email', () => ({ queueEmail }))
vi.mock('@/lib/auth', () => ({ requireUser: vi.fn() }))
vi.mock('@/lib/session', () => ({ loadSession: vi.fn() }))

import { db } from '@/lib/db'
import { daysUntil, currentBucket, sendContractExpiryReminders } from '@/services/contract-expiry'

const RUN = Date.now().toString().slice(-7)
let seq = 0
const uid = () => `ce-${RUN}-${seq++}`

beforeEach(() => {
  sendPushToUser.mockReset()
  sendPushToUser.mockResolvedValue(undefined)
  queueEmail.mockReset()
  queueEmail.mockResolvedValue(undefined)
})

test('daysUntil + currentBucket map days-left to the right milestone', () => {
  const now = new Date('2026-06-23T00:00:00Z')
  expect(daysUntil(new Date('2026-06-28T00:00:00Z'), now)).toBe(5)
  expect(currentBucket(120)).toBeNull()
  expect(currentBucket(45)).toBe(90)
  expect(currentBucket(20)).toBe(30)
  expect(currentBucket(5)).toBe(7)
  expect(currentBucket(-2)).toBe(0)
})

async function makeExpiringContract(daysLeft: number) {
  const client = await db.client.create({
    data: { legalName: `C ${uid()}`, nationalId: uid() },
  })
  const expiresAt = new Date(Date.now() + daysLeft * 86_400_000)
  const contract = await db.masterContract.create({
    data: {
      clientId: client.id,
      grantType: 'DISTRIBUTION',
      territory: 'EGYPT',
      termMonths: 12,
      coverageMode: 'RBT_AND_DIGITAL',
      expiresAt,
    },
  })
  return contract
}

test('sends one reminder per bucket and dedupes on re-run', async () => {
  const contract = await makeExpiringContract(5) // → bucket 7
  const watcher = uid()
  await db.watcher.create({ data: { userId: watcher, entity: 'MasterContract', entityId: contract.id } })

  const n1 = await sendContractExpiryReminders()
  expect(n1).toBeGreaterThanOrEqual(1)

  const reminder = await db.contractExpiryReminder.findUnique({
    where: { contractId_milestone: { contractId: contract.id, milestone: 7 } },
  })
  expect(reminder).not.toBeNull()

  const notif = await db.notification.findFirst({
    where: { recipientId: watcher, entity: 'MasterContract', entityId: contract.id, type: 'EXPIRY' },
  })
  expect(notif).not.toBeNull()
  expect(queueEmail).toHaveBeenCalled()

  // Re-run: same bucket already sent → no new reminder for this contract.
  await sendContractExpiryReminders()
  const reminders = await db.contractExpiryReminder.findMany({ where: { contractId: contract.id } })
  expect(reminders).toHaveLength(1)
})

test('contract far from expiry gets no reminder', async () => {
  const contract = await makeExpiringContract(200) // bucket null
  await sendContractExpiryReminders()
  const reminders = await db.contractExpiryReminder.findMany({ where: { contractId: contract.id } })
  expect(reminders).toHaveLength(0)
})

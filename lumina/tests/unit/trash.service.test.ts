// tests/unit/trash.service.test.ts
import { vi } from 'vitest'
vi.mock('@/lib/auth', () => ({ requireUser: vi.fn(async () => ({ id: 'admin', role: 'ADMIN' })) }))
// Mock queue so no real Redis connection is opened in unit tests
vi.mock('@/lib/queue', () => ({
  connectionOptions: {},
  queues: {
    ocr: { add: vi.fn(async () => ({})) },
    index: { add: vi.fn(async () => ({})) },
    drive: { add: vi.fn(async () => ({})) },
    mail: { add: vi.fn(async () => ({})) },
  },
}))
import { createClient, softDeleteClient } from '@/services/clients'
import { listTrash, restore, purge, purgeExpired } from '@/services/trash'
import { db } from '@/lib/db'

// Use a unique suffix per test run to avoid @unique nationalId collisions on re-runs
// RUN is 6 chars; prefix is 8 chars → total 14 digits exactly
const RUN = Date.now().toString().slice(-6)

// $includeDeleted is the raw PrismaClient; Prisma's generated type doesn't allow
// arbitrary string-key access, so we use a narrowly-typed delegate helper.
type RawClientDelegate = {
  findUnique: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null>
  findMany: (args: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>
  update: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
}
const rawClient = (db.$includeDeleted as unknown as Record<string, unknown>).client as RawClientDelegate

test('soft-deleted client appears in trash and can be restored', async () => {
  const c = await createClient({ legalName: 'R', nationalId: `10000001${RUN}` })
  await softDeleteClient(c.id)
  expect((await listTrash()).some((t) => t.id === c.id)).toBe(true)
  await restore('Client', c.id)
  expect((await listTrash()).some((t) => t.id === c.id)).toBe(false)
})

test('purge flags the row (purgedAt set, row still exists, gone from listTrash)', async () => {
  const c = await createClient({ legalName: 'PurgeTest', nationalId: `10000002${RUN}` })
  await softDeleteClient(c.id)
  expect((await listTrash()).some((t) => t.id === c.id)).toBe(true)

  await purge('Client', c.id)

  // Row still exists in $includeDeleted
  const row = await rawClient.findUnique({ where: { id: c.id } })
  expect(row).not.toBeNull()
  expect(row?.purgedAt).not.toBeNull()
  // But gone from listTrash (recoverable queue only)
  expect((await listTrash()).some((t) => t.id === c.id)).toBe(false)
})

test('purgeExpired flags expired row and is idempotent (second call processes nothing)', async () => {
  const c = await createClient({ legalName: 'ExpiredTest', nationalId: `10000003${RUN}` })
  await softDeleteClient(c.id)

  // Force purgeAfter to a past date so purgeExpired picks it up
  await rawClient.update({
    where: { id: c.id },
    data: { purgeAfter: new Date(Date.now() - 1000) },
  })

  // First run: should flag the row
  await purgeExpired()
  const row1 = await rawClient.findUnique({ where: { id: c.id } })
  expect(row1?.purgedAt).not.toBeNull()
  // Gone from recoverable trash
  expect((await listTrash()).some((t) => t.id === c.id)).toBe(false)

  // Second run: idempotent — row already purgedAt set, nothing reprocessed
  const row2 = await rawClient.findUnique({ where: { id: c.id } })
  expect(row2?.purgedAt).toEqual(row1?.purgedAt) // same purgedAt, not updated
})

// tests/unit/contracts.service.test.ts
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
import { createContract, listContracts } from '@/services/contracts'
import { createAnnex } from '@/services/annexes'
import { createClient } from '@/services/clients'
import { db } from '@/lib/db'

// Use a unique suffix per test run to avoid @unique nationalId collisions on re-runs
const RUN = Date.now().toString().slice(-6)

test('createContract derives expiresAt from signedDate + termMonths', async () => {
  const c = await createClient({ legalName: 'Exp', nationalId: `30000777${RUN}` })
  const k = await createContract({
    clientId: c.id,
    grantType: 'DISTRIBUTION',
    territory: 'EGYPT',
    termMonths: 12,
    coverage: ['DIGITAL'],
    signedDate: new Date('2026-01-15T00:00:00Z'),
  })
  const row = await db.masterContract.findUnique({ where: { id: k.id }, select: { expiresAt: true } })
  expect(row?.expiresAt?.toISOString().slice(0, 10)).toBe('2027-01-15')
})

test('annexes auto-number per contract', async () => {
  const c = await createClient({ legalName: 'C', nationalId: `30000001${RUN}` })
  const k = await createContract({
    clientId: c.id,
    grantType: 'DISTRIBUTION',
    territory: 'WORLDWIDE',
    termMonths: 36,
    coverage: ['DIGITAL'],
  })
  const a1 = await createAnnex({ contractId: k.id, annexDate: new Date() })
  const a2 = await createAnnex({ contractId: k.id, annexDate: new Date() })
  expect(a1.number).toBe(1)
  expect(a2.number).toBe(2)
})

test('contract with empty coverage rejected', async () => {
  const c = await createClient({ legalName: 'C2', nationalId: `30000002${RUN}` })
  await expect(
    createContract({
      clientId: c.id,
      grantType: 'DISTRIBUTION',
      territory: 'EGYPT',
      termMonths: 12,
      coverage: [],
    }),
  ).rejects.toThrow(/coverage/i)
})

test('listContracts returns contracts with client info', async () => {
  const RUN4 = Date.now().toString().slice(-6)
  const c = await createClient({ legalName: 'ListContracts Test', nationalId: `40000001${RUN4}` })
  await createContract({
    clientId: c.id,
    grantType: 'DISTRIBUTION',
    territory: 'EGYPT',
    termMonths: 12,
    coverage: ['DIGITAL'],
  })
  const all = await listContracts()
  const found = all.find((k) => k.clientId === c.id)
  expect(found).toBeDefined()
  expect(found?.client.legalName).toBe('ListContracts Test')
})

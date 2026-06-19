// tests/unit/clients.service.test.ts  (auth mocked)
import { vi, beforeEach } from 'vitest'
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
import { createClient, getClient } from '@/services/clients'
import { requireUser } from '@/lib/auth'

const mockRequireUser = requireUser as ReturnType<typeof vi.fn>

// Use a unique suffix per test run to avoid @unique nationalId collisions on re-runs
// RUN is 6 chars; prefix is 8 chars → total 14 digits exactly
const RUN = Date.now().toString().slice(-6)

beforeEach(() => {
  mockRequireUser.mockResolvedValue({ id: 'admin', role: 'ADMIN' })
})

test('create then read client', async () => {
  const c = await createClient({ legalName: 'Ahmed Alaa', nationalId: `20000001${RUN}` })
  const read = await getClient(c.id)
  expect(read?.legalName).toBe('Ahmed Alaa')
})

test('ADMIN sees nationalId in createClient and getClient', async () => {
  const c = await createClient({ legalName: 'Visible', nationalId: `20000002${RUN}` })
  expect(c.nationalId).toBe(`20000002${RUN}`)
  const read = await getClient(c.id)
  expect(read?.nationalId).toBe(`20000002${RUN}`)
})

test('non-ADMIN (OPERATIONS) gets nationalId redacted (null) from createClient and getClient', async () => {
  // First create as ADMIN to get the client id
  const c = await createClient({ legalName: 'Redacted', nationalId: `20000003${RUN}` })

  // Switch to OPERATIONS role for subsequent calls
  mockRequireUser.mockResolvedValue({ id: 'ops-user', role: 'OPERATIONS' })

  const opsCreate = await createClient({ legalName: 'OpsCreated', nationalId: `20000004${RUN}` })
  expect(opsCreate.nationalId).toBeNull()

  const read = await getClient(c.id)
  expect(read?.nationalId).toBeNull()
})

test('createClient rejects nationalId that is not exactly 14 digits', async () => {
  await expect(createClient({ legalName: 'Bad', nationalId: '12345' })).rejects.toThrow('nationalId must be exactly 14 digits')
  await expect(createClient({ legalName: 'Bad2', nationalId: '123456789012345' })).rejects.toThrow('nationalId must be exactly 14 digits')
  await expect(createClient({ legalName: 'Bad3', nationalId: 'abcdefghijklmn' })).rejects.toThrow('nationalId must be exactly 14 digits')
})

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
import { createClient, getClient, getClientTree } from '@/services/clients'
import { createContract } from '@/services/contracts'
import { createAnnex } from '@/services/annexes'
import { createWork } from '@/services/works'
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

test('getClientTree returns null for missing client', async () => {
  const result = await getClientTree('nonexistent-id-xxxx')
  expect(result).toBeNull()
})

test('getClientTree returns nested tree for ADMIN', async () => {
  const RUN2 = Date.now().toString().slice(-6)
  const c = await createClient({ legalName: 'Tree Test', nationalId: `99000001${RUN2}` })
  const k = await createContract({
    clientId: c.id,
    grantType: 'EXCLUSIVE_LICENSE',
    territory: 'EGYPT',
    termMonths: 12,
    coverage: ['DIGITAL'],
  })
  const a = await createAnnex({ contractId: k.id, annexDate: new Date() })
  await createWork({ title: 'أغنية تجريبية', annexId: a.id, credits: [{ role: 'AUTHOR', name: 'محمد' }] })
  const tree = await getClientTree(c.id)
  expect(tree).not.toBeNull()
  expect(tree?.legalName).toBe('Tree Test')
  expect(tree?.contracts).toHaveLength(1)
  expect(tree?.contracts[0].annexes).toHaveLength(1)
  expect(tree?.contracts[0].annexes[0].works).toHaveLength(1)
})

test('getClientTree redacts nationalId for OPERATIONS role', async () => {
  // First create as admin
  mockRequireUser.mockResolvedValueOnce({ id: 'admin', role: 'ADMIN' })
  const RUN3 = Date.now().toString().slice(-6)
  const c = await createClient({ legalName: 'RedactTree', nationalId: `99000002${RUN3}` })
  // Now read as OPERATIONS
  mockRequireUser.mockResolvedValue({ id: 'ops', role: 'OPERATIONS' })
  const tree = await getClientTree(c.id)
  expect(tree?.nationalId).toBeNull()
})

// tests/unit/clients.service.test.ts  (auth mocked)
import { vi } from 'vitest'
vi.mock('@/lib/auth', () => ({ requireUser: vi.fn(async () => ({ id: 'admin', role: 'ADMIN' })) }))
import { createClient, getClient } from '@/services/clients'

// Use a unique suffix per test run to avoid @unique nationalId collisions on re-runs
const RUN = Date.now().toString().slice(-6)

test('create then read client', async () => {
  const c = await createClient({ legalName: 'Ahmed Alaa', nationalId: `289021021${RUN}00` })
  const read = await getClient(c.id)
  expect(read?.legalName).toBe('Ahmed Alaa')
})

// tests/unit/trash.service.test.ts
import { vi } from 'vitest'
vi.mock('@/lib/auth', () => ({ requireUser: vi.fn(async () => ({ id: 'admin', role: 'ADMIN' })) }))
import { createClient, softDeleteClient } from '@/services/clients'
import { listTrash, restore } from '@/services/trash'

// Use a unique suffix per test run to avoid @unique nationalId collisions on re-runs
const RUN = Date.now().toString().slice(-6)

test('soft-deleted client appears in trash and can be restored', async () => {
  const c = await createClient({ legalName: 'R', nationalId: `100000000${RUN}77` })
  await softDeleteClient(c.id)
  expect((await listTrash()).some((t) => t.id === c.id)).toBe(true)
  await restore('Client', c.id)
  expect((await listTrash()).some((t) => t.id === c.id)).toBe(false)
})

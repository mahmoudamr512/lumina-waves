// tests/unit/contracts.service.test.ts
import { vi } from 'vitest'
vi.mock('@/lib/auth', () => ({ requireUser: vi.fn(async () => ({ id: 'admin', role: 'ADMIN' })) }))
import { createContract } from '@/services/contracts'
import { createAnnex } from '@/services/annexes'
import { createClient } from '@/services/clients'

// Use a unique suffix per test run to avoid @unique nationalId collisions on re-runs
const RUN = Date.now().toString().slice(-6)

test('annexes auto-number per contract', async () => {
  const c = await createClient({ legalName: 'C', nationalId: `100000000${RUN}99` })
  const k = await createContract({
    clientId: c.id,
    grantType: 'EXCLUSIVE_LICENSE',
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
  const c = await createClient({ legalName: 'C2', nationalId: `100000000${RUN}98` })
  await expect(
    createContract({
      clientId: c.id,
      grantType: 'EXCLUSIVE_LICENSE',
      territory: 'EGYPT',
      termMonths: 12,
      coverage: [],
    }),
  ).rejects.toThrow(/coverage/i)
})

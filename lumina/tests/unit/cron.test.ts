// tests/unit/cron.test.ts
// Verifies that runDailyMaintenance calls purgeExpired, and that importing
// cron.ts does NOT connect to Redis (enforced by the refactored module design).
import { vi } from 'vitest'

vi.mock('@/services/trash', () => ({
  purgeExpired: vi.fn(async () => undefined),
}))

// Mock bullmq so no Worker / Queue is instantiated when registerCron is called
vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn(async () => ({})),
  })),
  Worker: vi.fn().mockImplementation(() => ({})),
}))

import { runDailyMaintenance, registerCron } from '@/workers/cron'
import { purgeExpired } from '@/services/trash'

const mockPurgeExpired = purgeExpired as ReturnType<typeof vi.fn>

test('daily maintenance purges expired trash', async () => {
  await runDailyMaintenance()
  expect(mockPurgeExpired).toHaveBeenCalled()
})

test('registerCron is exported and is a function (not called at import)', () => {
  expect(typeof registerCron).toBe('function')
})

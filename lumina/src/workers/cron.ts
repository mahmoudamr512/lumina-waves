// src/workers/cron.ts
// Daily maintenance cron for Lumina Waves.
//
// Design: NO Redis connection is opened at module import-time.
//   - runDailyMaintenance() is a pure function that calls purgeExpired().
//     Unit tests import ONLY this function and mock @/services/trash.
//   - registerCron() creates the BullMQ Queue + repeatable job + Worker.
//     It is called ONLY from the worker entrypoint (src/workers/index.ts).
//     This keeps imports in tests free of Redis side-effects.

import { purgeExpired } from '@/services/trash'

export async function runDailyMaintenance(): Promise<void> {
  await purgeExpired()
}

export async function registerCron(): Promise<void> {
  // Dynamic imports keep Redis off the module-load critical path.
  const { Queue, Worker } = await import('bullmq')
  const { connectionOptions } = await import('@/lib/queue')

  const q = new Queue('cron', { connection: connectionOptions })
  await q.add('daily', {}, { repeat: { pattern: '0 3 * * *' } })

  new Worker('cron', async () => runDailyMaintenance(), { connection: connectionOptions })
  console.log('[cron] Daily trash-expiry job registered (UTC 03:00)')
}

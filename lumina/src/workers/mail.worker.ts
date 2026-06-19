// src/workers/mail.worker.ts
// BullMQ worker that consumes 'mail' queue jobs and sends them via SMTP.
// The sendMail handler is exported separately so it can be unit-tested
// without opening a real Redis connection.

import { Worker } from 'bullmq'
import { connectionOptions } from '@/lib/queue'
import { sendMail } from '@/lib/mail'

export async function handleMailJob(data: { to: string; subject: string; html: string }) {
  await sendMail(data)
}

// Register the BullMQ worker. This runs when the module is imported by the
// worker entrypoint (src/workers/index.ts), not during unit-test imports.
new Worker('mail', async (job) => handleMailJob(job.data), { connection: connectionOptions })

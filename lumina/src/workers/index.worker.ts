import { Worker } from 'bullmq'
import { connectionOptions } from '@/lib/queue'
import { db } from '@/lib/db'
import { indexDocument } from '@/lib/search'

new Worker(
  'index',
  async (job) => {
    const { documentId } = job.data as { documentId: string }
    const d = await db.document.findUnique({ where: { id: documentId } })
    if (d) await indexDocument({ id: d.id, title: d.filename, ocrText: d.ocrText ?? '' })
  },
  { connection: connectionOptions },
)

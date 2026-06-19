import { Worker } from 'bullmq'
import { connectionOptions, queues } from '@/lib/queue'
import { getOcrProvider } from '@/lib/ocr/provider'
import { db } from '@/lib/db'

new Worker(
  'ocr',
  async (job) => {
    const { documentId, filePath } = job.data as { documentId: string; filePath: string }
    const text = await getOcrProvider().extract(filePath)
    await db.document.update({ where: { id: documentId }, data: { ocrText: text } })
    await queues.index.add('index', { documentId })
  },
  { connection: connectionOptions },
)

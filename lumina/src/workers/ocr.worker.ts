import { Worker } from 'bullmq'
import { connectionOptions, queues } from '@/lib/queue'
import { getOcrProvider } from '@/lib/ocr/provider'
import { db } from '@/lib/db'

export async function handleOcrJob(job: { data: { documentId: string; filePath: string } }) {
  const { documentId, filePath } = job.data
  const text = await getOcrProvider().extract(filePath)
  await db.document.update({ where: { id: documentId }, data: { ocrText: text } })
  await queues.index.add('index', { documentId })
}

new Worker('ocr', handleOcrJob, { connection: connectionOptions })

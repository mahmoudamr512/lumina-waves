import { Queue } from 'bullmq'
import IORedis from 'ioredis'

export const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  lazyConnect: true,
})

const make = (name: string) => new Queue(name, { connection })

export const queues = {
  ocr: make('ocr'),
  index: make('index'),
  drive: make('drive'),
  mail: make('mail'),
}

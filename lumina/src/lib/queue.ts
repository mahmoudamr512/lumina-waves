import { Queue } from 'bullmq'
import type { ConnectionOptions } from 'bullmq'

// Plain options object — BullMQ creates its own internal IORedis instance
// using its bundled ioredis, avoiding version-mismatch type errors.
// lazyConnect: true means importing this module (e.g. in unit tests) does NOT
// eagerly open a TCP connection to Redis — it connects on first command.
function parseRedisOptions(): ConnectionOptions {
  const url = process.env.REDIS_URL
  if (url) {
    return { url, maxRetriesPerRequest: null, lazyConnect: true } as ConnectionOptions
  }
  return { host: 'localhost', port: 6379, maxRetriesPerRequest: null, lazyConnect: true }
}

export const connectionOptions: ConnectionOptions = parseRedisOptions()

const make = (name: string) => new Queue(name, { connection: connectionOptions })

export const queues = {
  ocr: make('ocr'),
  index: make('index'),
  drive: make('drive'),
  mail: make('mail'),
}

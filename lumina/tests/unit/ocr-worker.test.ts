// tests/unit/ocr-worker.test.ts
import { vi, beforeEach } from 'vitest'

// Mock the OCR provider — no real file system or tesseract needed
vi.mock('@/lib/ocr/provider', () => ({
  getOcrProvider: vi.fn(() => ({
    extract: vi.fn(async () => 'مرحبا بك في لومينا ويفز'),
  })),
}))

// Mock queues to prevent Redis connections
vi.mock('@/lib/queue', () => ({
  connectionOptions: {},
  queues: {
    ocr: { add: vi.fn(async () => ({})), name: 'ocr' },
    index: { add: vi.fn(async () => ({})), name: 'index' },
    drive: { add: vi.fn(async () => ({})), name: 'drive' },
    mail: { add: vi.fn(async () => ({})), name: 'mail' },
  },
}))

// Mock bullmq Worker so it never connects to Redis at import time
vi.mock('bullmq', async (importOriginal) => {
  const actual = await importOriginal<typeof import('bullmq')>()
  return {
    ...actual,
    Worker: vi.fn().mockImplementation(function () { return {} }),
  }
})

import { handleOcrJob } from '@/workers/ocr.worker'
import { getOcrProvider } from '@/lib/ocr/provider'
import { queues } from '@/lib/queue'
import { db } from '@/lib/db'

const mockGetOcrProvider = getOcrProvider as ReturnType<typeof vi.fn>
const mockQueues = queues as unknown as { index: { add: ReturnType<typeof vi.fn> } }

beforeEach(() => {
  vi.clearAllMocks()
  // Reset to a fresh mock implementation for each test
  mockGetOcrProvider.mockReturnValue({
    extract: vi.fn(async () => 'extracted text'),
  })
})

test('handleOcrJob calls getOcrProvider().extract with filePath', async () => {
  // Create a real document in the DB for the update to target
  const doc = await db.document.create({
    data: { filename: 'test-ocr.pdf', storagePath: '/tmp/test-ocr.pdf', status: 'EXECUTED' },
  })

  await handleOcrJob({ data: { documentId: doc.id, filePath: '/tmp/test-ocr.pdf' } })

  const extractMock = mockGetOcrProvider.mock.results[0].value.extract
  expect(extractMock).toHaveBeenCalledWith('/tmp/test-ocr.pdf')
})

test('handleOcrJob updates document ocrText in the DB', async () => {
  const extractedText = 'النص المستخرج من الملف'
  mockGetOcrProvider.mockReturnValue({
    extract: vi.fn(async () => extractedText),
  })

  const doc = await db.document.create({
    data: { filename: 'test-ocr2.pdf', storagePath: '/tmp/test-ocr2.pdf', status: 'EXECUTED' },
  })

  await handleOcrJob({ data: { documentId: doc.id, filePath: '/tmp/test-ocr2.pdf' } })

  const updated = await db.document.findUnique({ where: { id: doc.id } })
  expect(updated?.ocrText).toBe(extractedText)
})

test('handleOcrJob enqueues an index job after OCR', async () => {
  const doc = await db.document.create({
    data: { filename: 'test-ocr3.pdf', storagePath: '/tmp/test-ocr3.pdf', status: 'EXECUTED' },
  })

  await handleOcrJob({ data: { documentId: doc.id, filePath: '/tmp/test-ocr3.pdf' } })

  expect(mockQueues.index.add).toHaveBeenCalledWith('index', { documentId: doc.id })
})

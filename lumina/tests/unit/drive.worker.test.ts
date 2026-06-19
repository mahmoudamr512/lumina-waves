// tests/unit/drive.worker.test.ts
import { vi } from 'vitest'

// Use vi.hoisted so these are available when the vi.mock factory runs (hoisted to top)
const { ensure, upsertJson, upsertFileMock, isDriveConfiguredMock } = vi.hoisted(() => ({
  ensure: vi.fn(async () => 'fid'),
  upsertJson: vi.fn(async () => 'file-id'),
  upsertFileMock: vi.fn(async () => 'file-id'),
  isDriveConfiguredMock: vi.fn(() => true),
}))

vi.mock('@/lib/drive', () => ({
  ensureFolderPath: ensure,
  upsertJson,
  upsertFile: upsertFileMock,
  isDriveConfigured: isDriveConfiguredMock,
}))

// Mock queue — no real Redis needed
vi.mock('@/lib/queue', () => ({
  connectionOptions: {},
  connection: {},
  queues: {
    ocr: { add: vi.fn(async () => ({})) },
    index: { add: vi.fn(async () => ({})) },
    drive: { add: vi.fn(async () => ({})) },
    mail: { add: vi.fn(async () => ({})) },
  },
}))

// Mock BullMQ Worker so it never opens a real Redis connection in unit tests
vi.mock('bullmq', async (importOriginal) => {
  const orig = await importOriginal<typeof import('bullmq')>()
  return {
    ...orig,
    Worker: class {
      constructor() { /* no-op */ }
    },
  }
})

import { backupClient } from '@/workers/drive.worker'
import { db } from '@/lib/db'

const RUN = Date.now().toString().slice(-6)

test('writes client data.json under the client folder', async () => {
  isDriveConfiguredMock.mockReturnValue(true)
  ensure.mockClear()
  upsertJson.mockClear()

  const c = await db.client.create({
    data: { legalName: 'Ahmed Alaa', nationalId: `60000001${RUN}` },
  })

  await backupClient(c.id)

  expect(ensure).toHaveBeenCalledWith(['Ahmed Alaa'])
  expect(upsertJson).toHaveBeenCalledWith(
    'fid',
    'data.json',
    expect.objectContaining({ legalName: 'Ahmed Alaa' }),
  )
})

test('backupClient is a no-op when isDriveConfigured returns false', async () => {
  isDriveConfiguredMock.mockReturnValue(false)
  ensure.mockClear()
  upsertJson.mockClear()

  const c = await db.client.create({
    data: { legalName: 'Unconfigured Client', nationalId: `60000002${RUN}` },
  })

  await backupClient(c.id)

  expect(ensure).not.toHaveBeenCalled()
  expect(upsertJson).not.toHaveBeenCalled()
})

test('backupClient silently returns when client does not exist', async () => {
  isDriveConfiguredMock.mockReturnValue(true)
  ensure.mockClear()
  upsertJson.mockClear()

  await backupClient('non-existent-id')

  expect(ensure).not.toHaveBeenCalled()
  expect(upsertJson).not.toHaveBeenCalled()
})

test('backupClient uses stageName as folder name when set', async () => {
  isDriveConfiguredMock.mockReturnValue(true)
  ensure.mockClear()
  upsertJson.mockClear()

  const c = await db.client.create({
    data: { legalName: 'Full Name', stageName: 'Stage Name', nationalId: `60000003${RUN}` },
  })

  await backupClient(c.id)

  expect(ensure).toHaveBeenCalledWith(['Stage Name'])
})

// tests/unit/drive.test.ts
import { vi, beforeEach, afterEach } from 'vitest'

// Typed mock returns so `.mockResolvedValue(...)` accepts folder records
// (an untyped `vi.fn` would infer `files: never[]` and reject `[{ id }]`).
const create = vi.fn(async (): Promise<{ data: { id: string } }> => ({ data: { id: 'new' } }))
const list = vi.fn(async (): Promise<{ data: { files: { id: string }[] } }> => ({ data: { files: [] } }))

vi.mock('googleapis', () => ({
  google: {
    auth: { GoogleAuth: class { getClient() { return {} } } },
    drive: () => ({ files: { create, list } }),
  },
}))

import { ensureFolderPath, isDriveConfigured } from '@/lib/drive'

beforeEach(() => {
  create.mockClear()
  list.mockClear()
  // reset to no env vars by default
  delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  delete process.env.DRIVE_FOLDER_ID
})

afterEach(() => {
  delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  delete process.env.DRIVE_FOLDER_ID
})

test('isDriveConfigured returns false when env vars are empty', () => {
  process.env.GOOGLE_SERVICE_ACCOUNT_JSON = ''
  process.env.DRIVE_FOLDER_ID = ''
  expect(isDriveConfigured()).toBe(false)
})

test('isDriveConfigured returns false when env vars are missing', () => {
  delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  delete process.env.DRIVE_FOLDER_ID
  expect(isDriveConfigured()).toBe(false)
})

test('isDriveConfigured returns true when both env vars are set', () => {
  process.env.GOOGLE_SERVICE_ACCOUNT_JSON = '{"type":"service_account"}'
  process.env.DRIVE_FOLDER_ID = 'root-folder-id'
  expect(isDriveConfigured()).toBe(true)
})

test('creates each missing folder segment', async () => {
  process.env.GOOGLE_SERVICE_ACCOUNT_JSON = '{"type":"service_account"}'
  process.env.DRIVE_FOLDER_ID = 'root-folder-id'
  list.mockResolvedValue({ data: { files: [] } })
  create.mockResolvedValue({ data: { id: 'new' } })

  const id = await ensureFolderPath(['Ahmed Alaa', 'Master Contract 2018'])

  expect(create).toHaveBeenCalledTimes(2)
  expect(id).toBe('new')
})

test('reuses existing folder if it already exists', async () => {
  process.env.GOOGLE_SERVICE_ACCOUNT_JSON = '{"type":"service_account"}'
  process.env.DRIVE_FOLDER_ID = 'root-folder-id'
  list.mockResolvedValue({ data: { files: [{ id: 'existing-id' }] } })

  const id = await ensureFolderPath(['Ahmed Alaa'])

  expect(create).not.toHaveBeenCalled()
  expect(id).toBe('existing-id')
})

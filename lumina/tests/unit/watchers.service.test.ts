import { vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({ requireUser: vi.fn() }))
vi.mock('@/lib/session', () => ({ loadSession: vi.fn() }))

import { requireUser } from '@/lib/auth'
import { loadSession } from '@/lib/session'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { ValidationError } from '@/lib/errors'
import { watch, unwatch, isWatching, ensureWatching, listWatcherIds } from '@/services/watchers'

const mockRequireUser = requireUser as unknown as ReturnType<typeof vi.fn>
const mockLoadSession = loadSession as unknown as ReturnType<typeof vi.fn>

const RUN = Date.now().toString().slice(-6)
let seq = 0
const eid = () => `w-${RUN}-${seq++}`
const email = () => `wtc${seq++}.${RUN}@e.test`

async function mkUser() {
  return db.user.create({ data: { email: email(), name: 'W', role: 'VIEWER', passwordHash: await hashPassword('pw') } })
}
function actAs(id: string) {
  mockRequireUser.mockResolvedValue({ id, role: 'VIEWER', sid: 's' })
  mockLoadSession.mockResolvedValue({ id, role: 'VIEWER', sid: 's' })
}

beforeEach(() => {
  mockRequireUser.mockReset()
  mockLoadSession.mockReset()
})

test('watch then isWatching is true; unwatch makes it false', async () => {
  const u = await mkUser()
  actAs(u.id)
  const entityId = eid()
  expect(await isWatching('Client', entityId)).toBe(false)
  await watch('Client', entityId)
  expect(await isWatching('Client', entityId)).toBe(true)
  await unwatch('Client', entityId)
  expect(await isWatching('Client', entityId)).toBe(false)
})

test('watch and ensureWatching are idempotent', async () => {
  const u = await mkUser()
  actAs(u.id)
  const entityId = eid()
  await watch('Client', entityId)
  await watch('Client', entityId)
  await ensureWatching(u.id, 'Client', entityId)
  const count = await db.watcher.count({ where: { userId: u.id, entity: 'Client', entityId } })
  expect(count).toBe(1)
})

test('listWatcherIds returns all watchers of a record', async () => {
  const a = await mkUser()
  const b = await mkUser()
  const entityId = eid()
  await ensureWatching(a.id, 'MasterContract', entityId)
  await ensureWatching(b.id, 'MasterContract', entityId)
  const ids = await listWatcherIds('MasterContract', entityId)
  expect(ids.sort()).toEqual([a.id, b.id].sort())
})

test('invalid entity is rejected', async () => {
  const u = await mkUser()
  actAs(u.id)
  await expect(watch('NotAThing', eid())).rejects.toBeInstanceOf(ValidationError)
})

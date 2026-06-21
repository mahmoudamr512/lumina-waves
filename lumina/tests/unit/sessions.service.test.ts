import { vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({ requireUser: vi.fn() }))
vi.mock('@/lib/session', async (orig) => {
  const actual = await orig<typeof import('@/lib/session')>()
  return { ...actual, loadSession: vi.fn() }
})

import { requireUser } from '@/lib/auth'
import { loadSession, createSessionRecord } from '@/lib/session'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { AuthzError } from '@/lib/errors'
import {
  listSessionsForUser,
  revokeSession,
  revokeAllUserSessions,
  listMySessions,
  revokeMySession,
  revokeMyOtherSessions,
} from '@/services/sessions'

const mockRequireUser = requireUser as unknown as ReturnType<typeof vi.fn>
const mockLoadSession = loadSession as unknown as ReturnType<typeof vi.fn>

const RUN = Date.now().toString().slice(-6)
let seq = 0
const email = () => `ses${seq++}.${RUN}@e.test`

async function mkUser() {
  return db.user.create({ data: { email: email(), name: 'S', role: 'VIEWER', passwordHash: await hashPassword('pw') } })
}

beforeEach(() => {
  mockRequireUser.mockReset()
  mockRequireUser.mockResolvedValue({ id: 'admin', role: 'ADMIN', sid: 'admin-sid' })
  mockLoadSession.mockReset()
})

test('admin can list and revoke a user session', async () => {
  const u = await mkUser()
  const sid = await createSessionRecord(u.id)
  const list = await listSessionsForUser(u.id)
  expect(list.some((s) => s.id === sid)).toBe(true)
  await revokeSession(sid)
  expect((await db.userSession.findUnique({ where: { id: sid } }))?.revokedAt).not.toBeNull()
})

test('admin revokeAll revokes every active session of a user', async () => {
  const u = await mkUser()
  const a = await createSessionRecord(u.id)
  const b = await createSessionRecord(u.id)
  await revokeAllUserSessions(u.id)
  expect((await db.userSession.findUnique({ where: { id: a } }))?.revokedAt).not.toBeNull()
  expect((await db.userSession.findUnique({ where: { id: b } }))?.revokedAt).not.toBeNull()
})

test('self: listMySessions flags the current session', async () => {
  const u = await mkUser()
  const cur = await createSessionRecord(u.id)
  await createSessionRecord(u.id)
  mockLoadSession.mockResolvedValue({ id: u.id, role: 'VIEWER', sid: cur })
  const mine = await listMySessions()
  expect(mine.find((s) => s.id === cur)?.current).toBe(true)
})

test('self: revokeMyOtherSessions keeps the current one', async () => {
  const u = await mkUser()
  const cur = await createSessionRecord(u.id)
  const other = await createSessionRecord(u.id)
  mockLoadSession.mockResolvedValue({ id: u.id, role: 'VIEWER', sid: cur })
  await revokeMyOtherSessions()
  expect((await db.userSession.findUnique({ where: { id: cur } }))?.revokedAt).toBeNull()
  expect((await db.userSession.findUnique({ where: { id: other } }))?.revokedAt).not.toBeNull()
})

test('self: cannot revoke another user session (ownership scope)', async () => {
  const owner = await mkUser()
  const attacker = await mkUser()
  const victimSid = await createSessionRecord(owner.id)
  mockLoadSession.mockResolvedValue({ id: attacker.id, role: 'VIEWER', sid: 'attacker-sid' })
  await expect(revokeMySession(victimSid)).rejects.toBeInstanceOf(AuthzError)
  expect((await db.userSession.findUnique({ where: { id: victimSid } }))?.revokedAt).toBeNull()
})

import { vi, beforeEach } from 'vitest'

// Real session.ts imports NextAuth (next/server) which can't load in the node
// test env — stub the auth module; we override loadSession below anyway.
vi.mock('@/lib/auth', () => ({ auth: vi.fn(), requireUser: vi.fn() }))
vi.mock('@/lib/session', async (orig) => {
  const actual = await orig<typeof import('@/lib/session')>()
  return { ...actual, loadSession: vi.fn() }
})

import { loadSession, createSessionRecord } from '@/lib/session'
import { db } from '@/lib/db'
import { hashPassword, verifyPassword } from '@/lib/password'
import { ValidationError } from '@/lib/errors'
import { getMyProfile, updateMyProfile, changeMyPassword } from '@/services/account'

const mockLoadSession = loadSession as unknown as ReturnType<typeof vi.fn>

const RUN = Date.now().toString().slice(-6)
let seq = 0
const email = () => `acc${seq++}.${RUN}@e.test`

async function mkUserWithSession(pw = 'old-pw-123') {
  const u = await db.user.create({ data: { email: email(), name: 'Acc', role: 'VIEWER', passwordHash: await hashPassword(pw) } })
  const sid = await createSessionRecord(u.id)
  mockLoadSession.mockResolvedValue({ id: u.id, role: 'VIEWER', sid })
  return { u, sid }
}

beforeEach(() => mockLoadSession.mockReset())

test('getMyProfile returns the caller profile without passwordHash', async () => {
  const { u } = await mkUserWithSession()
  const p = await getMyProfile()
  expect(p?.id).toBe(u.id)
  expect((p as Record<string, unknown>).passwordHash).toBeUndefined()
})

test('updateMyProfile edits own name/phone', async () => {
  await mkUserWithSession()
  const p = await updateMyProfile({ name: 'Renamed', phone: '0111' })
  expect(p.name).toBe('Renamed')
  expect(p.phone).toBe('0111')
})

test('updateMyProfile rejects an email already in use', async () => {
  const taken = email()
  await db.user.create({ data: { email: taken, name: 'X', role: 'VIEWER', passwordHash: await hashPassword('pw') } })
  await mkUserWithSession()
  await expect(updateMyProfile({ email: taken })).rejects.toMatchObject({ code: 'DUPLICATE_EMAIL' })
})

test('changeMyPassword rejects a wrong current password and changes nothing', async () => {
  const { u } = await mkUserWithSession('correct-current')
  const before = await db.user.findUnique({ where: { id: u.id }, select: { passwordHash: true } })
  await expect(changeMyPassword('WRONG', 'new-pw-123')).rejects.toBeInstanceOf(ValidationError)
  const after = await db.user.findUnique({ where: { id: u.id }, select: { passwordHash: true } })
  expect(after?.passwordHash).toBe(before?.passwordHash)
})

test('changeMyPassword updates the hash and revokes OTHER sessions only', async () => {
  const { u, sid } = await mkUserWithSession('correct-current')
  const other = await createSessionRecord(u.id)
  await changeMyPassword('correct-current', 'fresh-pw-456')
  const row = await db.user.findUnique({ where: { id: u.id }, select: { passwordHash: true } })
  expect(await verifyPassword('fresh-pw-456', row!.passwordHash)).toBe(true)
  expect((await db.userSession.findUnique({ where: { id: sid } }))?.revokedAt).toBeNull()
  expect((await db.userSession.findUnique({ where: { id: other } }))?.revokedAt).not.toBeNull()
})

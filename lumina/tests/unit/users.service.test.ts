import { vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({ requireUser: vi.fn() }))

import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { ValidationError } from '@/lib/errors'
import { createSessionRecord } from '@/lib/session'
import {
  createUser,
  updateUser,
  changeRole,
  setUserPassword,
  disableUser,
  enableUser,
  deleteUser,
  getUser,
  listUsers,
} from '@/services/users'

const mockRequireUser = requireUser as unknown as ReturnType<typeof vi.fn>

const RUN = Date.now().toString().slice(-6)
let seq = 0
const email = () => `usr${seq++}.${RUN}@e.test`

/** Make the acting principal an ADMIN with the given id. */
function actAs(id: string) {
  mockRequireUser.mockResolvedValue({ id, role: 'ADMIN', sid: 'sid' })
}

async function mkRawUser(role: 'ADMIN' | 'LEGAL' | 'VIEWER' = 'VIEWER') {
  return db.user.create({ data: { email: email(), name: 'Raw', role, passwordHash: await hashPassword('pw') } })
}

beforeEach(() => {
  mockRequireUser.mockReset()
  actAs('acting-admin-' + RUN)
})

test('createUser returns a user without passwordHash', async () => {
  const row = await createUser({ email: email(), name: 'New', role: 'VIEWER', password: 'secret12' })
  expect(row.name).toBe('New')
  expect((row as Record<string, unknown>).passwordHash).toBeUndefined()
})

test('createUser rejects a duplicate email', async () => {
  const e = email()
  await createUser({ email: e, name: 'A', role: 'VIEWER', password: 'secret12' })
  await expect(createUser({ email: e, name: 'B', role: 'VIEWER', password: 'secret12' })).rejects.toMatchObject({
    code: 'DUPLICATE_EMAIL',
  })
})

test('changeRole updates the role', async () => {
  const target = await mkRawUser('VIEWER')
  const row = await changeRole(target.id, 'LEGAL')
  expect(row.role).toBe('LEGAL')
})

test('updateUser edits profile fields', async () => {
  const target = await mkRawUser()
  const row = await updateUser(target.id, { name: 'Edited', phone: '0100' })
  expect(row.name).toBe('Edited')
  expect(row.phone).toBe('0100')
})

test('disableUser revokes the user sessions and sets disabledAt', async () => {
  const target = await mkRawUser('VIEWER')
  const sid = await createSessionRecord(target.id)
  const row = await disableUser(target.id)
  expect(row.disabledAt).not.toBeNull()
  const sess = await db.userSession.findUnique({ where: { id: sid } })
  expect(sess?.revokedAt).not.toBeNull()
  // enable clears it again
  const re = await enableUser(target.id)
  expect(re.disabledAt).toBeNull()
})

test('setUserPassword changes the hash and revokes sessions', async () => {
  const target = await mkRawUser('VIEWER')
  const before = await db.user.findUnique({ where: { id: target.id }, select: { passwordHash: true } })
  const sid = await createSessionRecord(target.id)
  await setUserPassword(target.id, 'brand-new-pw')
  const after = await db.user.findUnique({ where: { id: target.id }, select: { passwordHash: true } })
  expect(after?.passwordHash).not.toBe(before?.passwordHash)
  const sess = await db.userSession.findUnique({ where: { id: sid } })
  expect(sess?.revokedAt).not.toBeNull()
})

test('deleteUser soft-deletes (user no longer found)', async () => {
  const target = await mkRawUser('VIEWER')
  await deleteUser(target.id)
  expect(await getUser(target.id)).toBeNull()
})

test('self-action guard: an admin cannot disable / delete / demote themselves', async () => {
  const me = await mkRawUser('ADMIN')
  actAs(me.id)
  await expect(disableUser(me.id)).rejects.toMatchObject({ code: 'SELF_ACTION' })
  await expect(deleteUser(me.id)).rejects.toMatchObject({ code: 'SELF_ACTION' })
  await expect(changeRole(me.id, 'VIEWER')).rejects.toMatchObject({ code: 'SELF_ACTION' })
})

test('listUsers excludes soft-deleted and never leaks passwordHash', async () => {
  const keep = await mkRawUser('VIEWER')
  const gone = await mkRawUser('VIEWER')
  await deleteUser(gone.id)
  const rows = await listUsers()
  const ids = rows.map((r) => r.id)
  expect(ids).toContain(keep.id)
  expect(ids).not.toContain(gone.id)
  expect((rows[0] as Record<string, unknown>).passwordHash).toBeUndefined()
})

test('last-admin guard allows demoting an admin while other active admins exist', async () => {
  // The dev DB always has the seeded/e2e admin, so another admin is demotable.
  const extraAdmin = await mkRawUser('ADMIN')
  const row = await changeRole(extraAdmin.id, 'VIEWER')
  expect(row.role).toBe('VIEWER')
})

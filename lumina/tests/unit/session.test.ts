import { vi, beforeEach } from 'vitest'

// Control what the JWT session resolves to without a real request.
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { createSessionRecord, loadSession, revokeSessionRecord } from '@/lib/session'

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>

const RUN = Date.now().toString().slice(-6)
let seq = 0
const email = () => `sess${seq++}.${RUN}@e.test`

async function mkUser(role: 'ADMIN' | 'LEGAL' | 'VIEWER' = 'VIEWER', extra: Record<string, unknown> = {}) {
  return db.user.create({
    data: { email: email(), name: 'Sess User', role, passwordHash: await hashPassword('pw'), ...extra },
  })
}

beforeEach(() => mockAuth.mockReset())

test('active session returns the live role (reflects DB role changes)', async () => {
  const u = await mkUser('VIEWER')
  const sid = await createSessionRecord(u.id, '1.1.1.1', 'UA')
  mockAuth.mockResolvedValue({ user: { sid } })
  expect((await loadSession())?.role).toBe('VIEWER')
  await db.user.update({ where: { id: u.id }, data: { role: 'LEGAL' } })
  expect((await loadSession())?.role).toBe('LEGAL')
})

test('revoked session returns null', async () => {
  const u = await mkUser()
  const sid = await createSessionRecord(u.id)
  mockAuth.mockResolvedValue({ user: { sid } })
  await revokeSessionRecord(sid)
  expect(await loadSession()).toBeNull()
})

test('expired session returns null', async () => {
  const u = await mkUser()
  const sid = await createSessionRecord(u.id)
  await db.userSession.update({ where: { id: sid }, data: { expiresAt: new Date(Date.now() - 1000) } })
  mockAuth.mockResolvedValue({ user: { sid } })
  expect(await loadSession()).toBeNull()
})

test('disabled user returns null', async () => {
  const u = await mkUser()
  const sid = await createSessionRecord(u.id)
  await db.user.update({ where: { id: u.id }, data: { disabledAt: new Date() } })
  mockAuth.mockResolvedValue({ user: { sid } })
  expect(await loadSession()).toBeNull()
})

test('missing sid returns null', async () => {
  mockAuth.mockResolvedValue({ user: {} })
  expect(await loadSession()).toBeNull()
})

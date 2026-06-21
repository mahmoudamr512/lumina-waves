import { vi, beforeEach } from 'vitest'

vi.mock('@/lib/session', () => ({ loadSession: vi.fn() }))

import { loadSession } from '@/lib/session'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { searchMentionUsers, resolveMentions } from '@/services/mentions'

const mockLoadSession = loadSession as unknown as ReturnType<typeof vi.fn>
const RUN = Date.now().toString().slice(-6)
let seq = 0
const email = () => `mnt${seq++}.${RUN}@e.test`
async function mkUser(name: string) {
  return db.user.create({ data: { email: email(), name, role: 'VIEWER', passwordHash: await hashPassword('pw') } })
}

beforeEach(() => mockLoadSession.mockReset())

test('searchMentionUsers matches active users by Arabic-normalized name', async () => {
  const u = await mkUser(`منى ${RUN}`)
  mockLoadSession.mockResolvedValue({ id: u.id, role: 'VIEWER', sid: 's' })
  const res = await searchMentionUsers(`منى ${RUN}`)
  expect(res.some((r) => r.id === u.id)).toBe(true)
  // Empty query returns nothing.
  expect(await searchMentionUsers('')).toEqual([])
})

test('resolveMentions keeps only ids present as @Name in the body', async () => {
  const present = await mkUser(`حاضر${RUN}`)
  const absent = await mkUser(`غائب${RUN}`)
  const body = `مرحبا @حاضر${RUN} كيف الحال`
  const out = await resolveMentions('Client', [present.id, absent.id], body)
  expect(out).toEqual([present.id])
})

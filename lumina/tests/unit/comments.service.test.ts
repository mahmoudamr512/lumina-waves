import { vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({ requireUser: vi.fn() }))
vi.mock('@/lib/session', () => ({ loadSession: vi.fn() }))

import { requireUser } from '@/lib/auth'
import { loadSession } from '@/lib/session'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { AuthzError, ValidationError } from '@/lib/errors'
import { listComments, addComment, editComment, deleteComment } from '@/services/comments'

const mockRequireUser = requireUser as unknown as ReturnType<typeof vi.fn>
const mockLoadSession = loadSession as unknown as ReturnType<typeof vi.fn>

const RUN = Date.now().toString().slice(-6)
let seq = 0
const eid = () => `c-${RUN}-${seq++}`
const email = () => `cmt${seq++}.${RUN}@e.test`

async function mkUser(role: 'ADMIN' | 'VIEWER' = 'VIEWER') {
  return db.user.create({ data: { email: email(), name: 'C', role, passwordHash: await hashPassword('pw') } })
}

function actAs(id: string, role: 'ADMIN' | 'VIEWER' = 'VIEWER') {
  mockRequireUser.mockResolvedValue({ id, role, sid: 's' })
  mockLoadSession.mockResolvedValue({ id, role, sid: 's' })
}

beforeEach(() => {
  mockRequireUser.mockReset()
  mockLoadSession.mockReset()
})

test('addComment validates body and entity', async () => {
  const u = await mkUser()
  actAs(u.id)
  await expect(addComment('Client', eid(), '   ')).rejects.toBeInstanceOf(ValidationError)
  await expect(addComment('Client', eid(), 'x'.repeat(5000))).rejects.toBeInstanceOf(ValidationError)
  await expect(addComment('NotAThing', eid(), 'hi')).rejects.toBeInstanceOf(ValidationError)
})

test('addComment creates a comment and writes a COMMENT audit row', async () => {
  const u = await mkUser()
  actAs(u.id)
  const entityId = eid()
  const id = await addComment('Client', entityId, 'مرحبا')
  expect(id).toBeTruthy()
  const audit = await db.auditLog.findFirst({ where: { entity: 'Client', entityId, action: 'COMMENT' } })
  expect(audit).not.toBeNull()
})

test('editComment is author-only and marks editedAt', async () => {
  const owner = await mkUser()
  const other = await mkUser()
  actAs(owner.id)
  const entityId = eid()
  const id = await addComment('Client', entityId, 'original')
  // Non-author cannot edit.
  actAs(other.id)
  await expect(editComment(id, 'hacked')).rejects.toBeInstanceOf(AuthzError)
  // Author can.
  actAs(owner.id)
  await editComment(id, 'updated')
  const row = await db.comment.findUnique({ where: { id } })
  expect(row?.body).toBe('updated')
  expect(row?.editedAt).not.toBeNull()
})

test('deleteComment: author or admin can soft-delete, others cannot', async () => {
  const owner = await mkUser()
  const stranger = await mkUser()
  const admin = await mkUser('ADMIN')
  actAs(owner.id)
  const entityId = eid()
  const id1 = await addComment('Client', entityId, 'first')
  const id2 = await addComment('Client', entityId, 'second')

  actAs(stranger.id)
  await expect(deleteComment(id1)).rejects.toBeInstanceOf(AuthzError)

  actAs(owner.id)
  await deleteComment(id1)
  expect((await db.comment.findUnique({ where: { id: id1 } }))?.deletedAt).not.toBeNull()

  actAs(admin.id, 'ADMIN') // admin moderates someone else's comment
  await deleteComment(id2)
  expect((await db.comment.findUnique({ where: { id: id2 } }))?.deletedAt).not.toBeNull()
})

test('listComments excludes deleted and flags mine', async () => {
  const owner = await mkUser()
  const other = await mkUser()
  const entityId = eid()
  actAs(owner.id)
  await addComment('Client', entityId, 'mine-1')
  const delId = await addComment('Client', entityId, 'to-delete')
  await deleteComment(delId)
  actAs(other.id)
  await addComment('Client', entityId, 'theirs')

  // List as owner.
  actAs(owner.id)
  const list = await listComments('Client', entityId)
  expect(list.map((c) => c.body)).toEqual(['mine-1', 'theirs'])
  expect(list.find((c) => c.body === 'mine-1')?.mine).toBe(true)
  expect(list.find((c) => c.body === 'theirs')?.mine).toBe(false)
})

import { vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({ requireUser: vi.fn() }))

import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { describeAudit, auditDiff, listEntityActivity, listGlobalActivity } from '@/services/activity'

const mockRequireUser = requireUser as unknown as ReturnType<typeof vi.fn>
const RUN = Date.now().toString().slice(-6)
let seq = 0
const eid = () => `ent-${RUN}-${seq++}`

beforeEach(() => mockRequireUser.mockReset())

test('describeAudit produces Arabic phrases', () => {
  expect(describeAudit({ action: 'CREATE', entity: 'MasterContract', meta: null, actorName: 'أحمد' })).toBe('أحمد أنشأ العقد')
  expect(describeAudit({ action: 'DOWNLOAD', entity: 'Document', meta: { filename: 'x.pdf' }, actorName: 'سارة' })).toBe(
    'سارة نزّل المستند «x.pdf»',
  )
  expect(describeAudit({ action: 'LOGIN', entity: 'User', meta: null, actorName: 'ليلى' })).toBe('ليلى سجّل الدخول')
  expect(describeAudit({ action: 'WEIRD', entity: 'Client', meta: null, actorName: 'X' })).toContain('WEIRD')
})

test('auditDiff masks sensitive values and is null for non-privileged roles', () => {
  const before = { legalName: 'A', nationalId: '11111111111111' }
  const after = { legalName: 'B', nationalId: '22222222222222' }
  expect(auditDiff('VIEWER', before, after)).toBeNull()
  const rows = auditDiff('ADMIN', before, after)!
  const legal = rows.find((r) => r.field === 'legalName')
  const nat = rows.find((r) => r.field === 'nationalId')
  expect(legal).toEqual({ field: 'legalName', before: 'A', after: 'B' })
  expect(nat).toEqual({ field: 'nationalId', before: null, after: null }) // masked
})

test('listEntityActivity excludes COMMENT rows', async () => {
  mockRequireUser.mockResolvedValue({ id: 'admin', role: 'ADMIN', sid: 's' })
  const entityId = eid()
  await db.auditLog.create({ data: { actorId: 'admin', action: 'CREATE', entity: 'Client', entityId } })
  await db.auditLog.create({ data: { actorId: 'admin', action: 'COMMENT', entity: 'Client', entityId } })
  const items = await listEntityActivity('Client', entityId)
  expect(items.length).toBe(1)
  expect(items[0].action).toBe('CREATE')
})

test('listGlobalActivity gates on the ADMIN-only User entity', async () => {
  // can('read','User') is ADMIN-only (see authz.user.test). Asserting the gate
  // is invoked with that entity proves the feed is admin-only.
  mockRequireUser.mockResolvedValue({ id: 'admin', role: 'ADMIN', sid: 's' })
  await listGlobalActivity()
  expect(mockRequireUser).toHaveBeenCalledWith('read', 'User')
})

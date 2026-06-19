import { writeAudit } from '@/lib/audit'
import { db } from '@/lib/db'

test('writes an audit row', async () => {
  await writeAudit({ actorId: 'u1', action: 'CREATE', entity: 'Client', entityId: 'c1', after: { legalName: 'A' } })
  const rows = await db.auditLog.findMany({ where: { entityId: 'c1' } })
  expect(rows[0].action).toBe('CREATE')
  // cleanup
  await db.$includeDeleted.auditLog.deleteMany({ where: { entityId: 'c1' } })
})

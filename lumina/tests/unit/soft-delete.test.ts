import { db } from '@/lib/db'

test('soft-deleted rows are hidden from normal reads', async () => {
  const c = await db.client.create({ data: { legalName: 'X', nationalId: '10000000000001' } })
  await db.$softDelete('Client', c.id, new Date(Date.now() + 3 * 864e5))
  expect(await db.client.findUnique({ where: { id: c.id } })).toBeNull()
  const raw = await db.$includeDeleted.client.findUnique({ where: { id: c.id } })
  expect(raw?.deletedAt).not.toBeNull()
  // cleanup
  await db.$includeDeleted.client.delete({ where: { id: c.id } })
})

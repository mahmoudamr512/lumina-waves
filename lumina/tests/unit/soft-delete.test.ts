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

test('count() excludes soft-deleted rows', async () => {
  const nationalId = '10000000000002'
  const c = await db.client.create({ data: { legalName: 'CountTest', nationalId } })
  const beforeDelete = await db.client.count({ where: { nationalId } })
  expect(beforeDelete).toBe(1)

  await db.$softDelete('Client', c.id, new Date(Date.now() + 3 * 864e5))

  const afterDelete = await db.client.count({ where: { nationalId } })
  expect(afterDelete).toBe(0)

  // cleanup
  await db.$includeDeleted.client.delete({ where: { id: c.id } })
})

test('findFirstOrThrow() excludes soft-deleted rows', async () => {
  const nationalId = '10000000000003'
  const c = await db.client.create({ data: { legalName: 'ThrowTest', nationalId } })
  await db.$softDelete('Client', c.id, new Date(Date.now() + 3 * 864e5))

  await expect(db.client.findFirstOrThrow({ where: { nationalId } })).rejects.toThrow()

  // cleanup
  await db.$includeDeleted.client.delete({ where: { id: c.id } })
})

test('findUnique with select:{id:true} still hides soft-deleted rows', async () => {
  const nationalId = '10000000000004'
  const c = await db.client.create({ data: { legalName: 'SelectTest', nationalId } })
  await db.$softDelete('Client', c.id, new Date(Date.now() + 3 * 864e5))

  // The select deliberately excludes deletedAt — the extension must still hide the row
  const result = await db.client.findUnique({
    where: { id: c.id },
    select: { id: true },
  })
  expect(result).toBeNull()

  // cleanup
  await db.$includeDeleted.client.delete({ where: { id: c.id } })
})

test('$softDelete throws for non-soft-deletable model', async () => {
  await expect(
    db.$softDelete('AuditLog', 'some-id', new Date(Date.now() + 3 * 864e5)),
  ).rejects.toThrow('model not soft-deletable: AuditLog')
})

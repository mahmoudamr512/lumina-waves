import { db } from '@/lib/db'

afterAll(() => db.$includeDeleted.$disconnect())

test('can create a client with national id', async () => {
  const c = await db.client.create({ data: { legalName: 'Test', nationalId: '28902102104713' } })
  expect(c.id).toBeTruthy()
  await db.$includeDeleted.client.delete({ where: { id: c.id } })
})

import { db } from '@/lib/db'

afterAll(() => db.$includeDeleted.$disconnect())

test('can create a client with national id', async () => {
  // Unique 14-digit nationalId per run so the test never collides with seeded
  // or leftover rows (nationalId is a @unique natural key).
  const nationalId = ('29' + Date.now().toString()).slice(0, 14).padEnd(14, '0')
  const c = await db.client.create({ data: { legalName: 'Test', nationalId } })
  expect(c.id).toBeTruthy()
  await db.$includeDeleted.client.delete({ where: { id: c.id } })
})

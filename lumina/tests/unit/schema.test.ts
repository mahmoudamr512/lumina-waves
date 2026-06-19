import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const db = new PrismaClient({ adapter })
afterAll(() => db.$disconnect())

test('can create a client with national id', async () => {
  const c = await db.client.create({ data: { legalName: 'Test', nationalId: '28902102104713' } })
  expect(c.id).toBeTruthy()
  await db.client.delete({ where: { id: c.id } })
})

import 'dotenv/config'
import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

async function main() {
  const passwordHash = await bcrypt.hash('changeme', 12)

  await db.user.upsert({
    where: { email: 'admin@luminawaves.com' },
    update: {},
    create: {
      email: 'admin@luminawaves.com',
      name: 'Admin',
      role: 'ADMIN',
      passwordHash,
    },
  })

  console.log('Seeded: admin@luminawaves.com')
}

main().finally(() => db.$disconnect())

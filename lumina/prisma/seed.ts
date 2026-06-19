import 'dotenv/config'
import { randomBytes } from 'node:crypto'
import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@luminawaves.com'

  let adminPassword = process.env.SEED_ADMIN_PASSWORD
  let generatedPassword: string | undefined

  if (!adminPassword) {
    if (process.env.NODE_ENV === 'production') {
      console.error(
        'ERROR: SEED_ADMIN_PASSWORD is required to seed in production. ' +
          'Set it in your environment and re-run.',
      )
      process.exit(1)
    }
    // Dev/test: generate a random password and print it once
    generatedPassword = randomBytes(16).toString('hex')
    adminPassword = generatedPassword
  }

  await db.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Admin',
      role: 'ADMIN',
      passwordHash: await bcrypt.hash(adminPassword, 12),
    },
  })

  if (generatedPassword) {
    console.log('==========================================================')
    console.log('WARNING: No SEED_ADMIN_PASSWORD set — generated a random')
    console.log(`  Admin email:    ${adminEmail}`)
    console.log(`  Admin password: ${generatedPassword}`)
    console.log('Log in and rotate this password immediately!')
    console.log('==========================================================')
  } else {
    console.log(`Seeded: ${adminEmail}`)
  }
}

main().finally(() => db.$disconnect())

// Demo seed for a live walkthrough: a deterministic ADMIN login + a client +
// a master contract, so the contract-generation wizard has real data to use.
// Run: npx tsx scripts/demo-seed.mjs
import 'dotenv/config'
import { createRequire } from 'node:module'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '../src/generated/prisma/client.ts'
import { PrismaPg } from '@prisma/adapter-pg'

const require = createRequire(import.meta.url)
void require
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })

const ADMIN_EMAIL = 'admin@luminawaves.com'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'demo1234'
const NID = '28902102104713'

async function main() {
  // Deterministic admin (force-set password so login is predictable for the demo).
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12)
  await db.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { passwordHash, role: 'ADMIN', deletedAt: null },
    create: { email: ADMIN_EMAIL, name: 'Admin', role: 'ADMIN', passwordHash },
  })

  // Demo client.
  const client = await db.client.upsert({
    where: { nationalId: NID },
    update: {},
    create: {
      legalName: 'أحمد علاء الدين محمد',
      stageName: 'أحمد علاء',
      nationalId: NID,
      address: 'مجموعة 116 أ، شارع الهرم، العمرانية، الجيزة',
      phone: '+201000000000',
    },
  })

  // Demo master contract (only create one if the client has none).
  const existing = await db.masterContract.findFirst({ where: { clientId: client.id, deletedAt: null } })
  const contract =
    existing ??
    (await db.masterContract.create({
      data: {
        clientId: client.id,
        grantType: 'EXCLUSIVE_LICENSE',
        territory: 'WORLDWIDE',
        termMonths: 36,
        autoRenew: true,
        noticeDays: 90,
        coverage: ['DIGITAL', 'BROADCAST', 'PUBLIC_PERF', 'SYNC', 'RBT', 'MECHANICAL'],
        revenueShareBps: 7000,
        minPayoutCents: 35000,
        settlementFreq: 'SEMIANNUAL',
        signedDate: new Date('2025-06-12'),
      },
    }))

  console.log('\n=== Lumina Waves — demo data ready ===')
  console.log('Login:    ' + ADMIN_EMAIL + '  /  ' + ADMIN_PASSWORD)
  console.log('Client:   ' + (client.stageName ?? client.legalName) + '  (id ' + client.id + ')')
  console.log('Contract: ' + contract.id)
  console.log('Generate: http://localhost:3000/contracts/' + contract.id + '/generate')
  console.log('Clients:  http://localhost:3000/clients')
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e)
    db.$disconnect()
    process.exit(1)
  })

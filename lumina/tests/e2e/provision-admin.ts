import 'dotenv/config'
import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './e2e-admin'

/**
 * Standalone provisioning script run via `tsx` (ESM, esbuild) from the
 * Playwright global setup. It is kept separate from global-setup.ts because the
 * generated Prisma client is ESM-only (uses `import.meta`) and cannot be loaded
 * by Playwright's CommonJS TS transform. `tsx` handles it the same way
 * prisma/seed.ts is run.
 *
 * Deterministic: force-sets passwordHash + role on the update path so the
 * credentials are stable even when the row already exists. Decoupled from
 * `prisma db seed` (whose admin password is random/idempotent).
 */
async function main() {
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  })
  try {
    const passwordHash = await bcrypt.hash(E2E_ADMIN_PASSWORD, 12)
    await db.user.upsert({
      where: { email: E2E_ADMIN_EMAIL },
      update: { passwordHash, role: 'ADMIN', name: 'E2E Admin' },
      create: { email: E2E_ADMIN_EMAIL, name: 'E2E Admin', role: 'ADMIN', passwordHash },
    })
    console.log(`[e2e] provisioned admin ${E2E_ADMIN_EMAIL}`)
  } finally {
    await db.$disconnect()
  }
}

main().catch((err) => {
  console.error('[e2e] failed to provision admin:', err)
  process.exit(1)
})

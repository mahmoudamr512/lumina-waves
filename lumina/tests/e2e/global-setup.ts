import { execFileSync } from 'node:child_process'
import path from 'node:path'

/**
 * Playwright global setup — deterministically ensures a known e2e admin exists
 * BEFORE the suite runs, DECOUPLED from `prisma db seed`.
 *
 * The actual DB write lives in `provision-admin.ts`, which we run via `tsx`
 * (the same ESM-capable loader prisma/seed.ts uses). This indirection is
 * required because the generated Prisma client is ESM-only (`import.meta`) and
 * cannot be loaded by Playwright's CommonJS TypeScript transform.
 */
export default function globalSetup() {
  const script = path.join(__dirname, 'provision-admin.ts')
  execFileSync('npx', ['tsx', script], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..', '..'),
  })
}

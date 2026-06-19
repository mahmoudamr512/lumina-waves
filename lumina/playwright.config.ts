import 'dotenv/config'
import { defineConfig, devices } from 'playwright/test'

/**
 * Playwright config for the Lumina Waves e2e smoke suite.
 *
 * - Spins up the Next.js dev server (`npm run dev`) and waits for it.
 * - `reuseExistingServer` outside CI so local re-runs are fast.
 * - `globalSetup` deterministically provisions the e2e admin BEFORE the suite
 *   (see tests/e2e/global-setup.ts) — decoupled from `prisma db seed`.
 * - Env (DATABASE_URL / AUTH_SECRET / REDIS_URL …) is read from `.env` via
 *   the `dotenv/config` import above and forwarded to the dev server.
 */
const PORT = 3000
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    locale: 'ar',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? '',
      REDIS_URL: process.env.REDIS_URL ?? '',
      AUTH_SECRET: process.env.AUTH_SECRET ?? 'dev-secret-change-me',
      MEILI_HOST: process.env.MEILI_HOST ?? '',
      MEILI_KEY: process.env.MEILI_KEY ?? '',
    },
  },
})

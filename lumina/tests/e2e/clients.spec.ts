import { test, expect } from 'playwright/test'
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './e2e-admin'

/**
 * End-to-end smoke test for the Phase-1 clients flow:
 *   unauthenticated /clients → proxy redirect to /login → log in as the e2e
 *   admin → land in the app → create a client → see it on the list.
 *
 * The e2e admin is provisioned deterministically by tests/e2e/global-setup.ts.
 */
test('clients smoke: login → create client → appears in list', async ({ page }) => {
  test.slow()

  // A unique, recognizable client per run so re-runs don't collide on the
  // 14-digit nationalId unique constraint.
  const stamp = Date.now().toString()
  const nationalId = ('2' + stamp).slice(0, 14).padEnd(14, '0')
  const legalName = `عميل اختبار ${stamp}`

  // 1. Hitting a protected route while unauthenticated bounces to /login.
  await page.goto('/clients')
  await expect(page).toHaveURL(/\/login/)

  // 2. Log in.
  await page.getByLabel('البريد الإلكتروني').fill(E2E_ADMIN_EMAIL)
  await page.getByLabel('كلمة المرور').fill(E2E_ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click()

  // 3. Land in the app on the clients list.
  await expect(page).toHaveURL(/\/clients$/, { timeout: 20_000 })
  await expect(page.getByRole('heading', { name: 'العملاء', level: 1 })).toBeVisible()

  // 4. Go to the create form.
  await page.getByRole('link', { name: 'عميل جديد' }).first().click()
  await expect(page).toHaveURL(/\/clients\/new$/)

  // 5. Fill and submit.
  await page.getByLabel('الاسم القانوني', { exact: false }).fill(legalName)
  await page.getByLabel('الرقم القومي', { exact: false }).fill(nationalId)
  await page.getByRole('button', { name: 'حفظ العميل' }).click()

  // 6. Back on the list, the new client is shown.
  await expect(page).toHaveURL(/\/clients$/, { timeout: 20_000 })
  await expect(page.getByText(legalName)).toBeVisible()
})

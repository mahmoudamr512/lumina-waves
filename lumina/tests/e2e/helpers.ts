import { type Page, expect } from 'playwright/test'
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './e2e-admin'

/** Log in as the deterministic e2e admin (no-op if already authenticated). */
export async function login(page: Page): Promise<void> {
  await page.goto('/clients')
  if (/\/login/.test(page.url())) {
    await page.getByLabel('البريد الإلكتروني').fill(E2E_ADMIN_EMAIL)
    await page.getByLabel('كلمة المرور').fill(E2E_ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click()
    await expect(page).toHaveURL(/\/clients$/, { timeout: 20_000 })
  }
}

/** Create a fresh client and land on its tree page; returns the page URL + name. */
export async function createClient(page: Page): Promise<{ url: string; legalName: string }> {
  const stamp = Date.now().toString()
  const nationalId = ('2' + stamp).slice(0, 14).padEnd(14, '0')
  const legalName = `عميل اختبار ${stamp}`
  await page.goto('/clients/new')
  await page.getByLabel('الاسم القانوني', { exact: false }).fill(legalName)
  await page.getByLabel('الرقم القومي', { exact: false }).fill(nationalId)
  await page.getByRole('button', { name: 'حفظ العميل' }).click()
  await expect(page).toHaveURL(/\/clients$/, { timeout: 20_000 })
  await page.getByText(legalName).first().click()
  await expect(page).toHaveURL(/\/clients\/[a-z0-9]+$/i, { timeout: 20_000 })
  return { url: page.url(), legalName }
}

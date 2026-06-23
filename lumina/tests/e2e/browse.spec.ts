import { test, expect } from 'playwright/test'
import { login, createClient } from './helpers'

test('clients list: search filters the grid and shows a no-results state', async ({ page }) => {
  test.slow()
  await login(page)
  const { legalName } = await createClient(page)

  await page.goto('/clients')

  // Filtering by the client's name keeps it visible.
  await page.getByLabel('بحث في العملاء').fill(legalName)
  await expect(page.getByText(legalName)).toBeVisible()

  // A query that matches nothing shows the empty state.
  await page.getByLabel('بحث في العملاء').fill('zzz-لا-يوجد-xyz')
  await expect(page.getByText('لا توجد نتائج')).toBeVisible()
})

test('system-wide search finds a client and links to its hub', async ({ page }) => {
  test.slow()
  await login(page)
  const { legalName } = await createClient(page)

  await page.goto('/search?q=' + encodeURIComponent(legalName))

  // The client appears under the العملاء group; clicking it opens the hub.
  await expect(page.getByText(legalName)).toBeVisible({ timeout: 15_000 })
  await page.getByText(legalName).click()
  await expect(page).toHaveURL(/\/clients\/[a-z0-9]+$/i, { timeout: 20_000 })
})

test('within-client search filters across the client and shows no-results', async ({ page }) => {
  test.slow()
  await login(page)
  await createClient(page)
  const clientUrl = page.url()

  // Add a contract (default grant type is distribution → "توزيع").
  await page.getByRole('link', { name: 'إضافة عقد' }).first().click()
  await page.getByText('التوزيع الرقمي والبث التدفقي').click()
  await page.getByRole('button', { name: 'حفظ العقد' }).click()
  await expect(page).toHaveURL(/\/contracts\/[a-z0-9]+$/i, { timeout: 20_000 })

  // Back on the client hub, the within-client search finds the contract.
  await page.goto(clientUrl)
  await page.getByLabel('بحث داخل ملف العميل').fill('توزيع')
  await expect(page.getByText('توزيع', { exact: true }).first()).toBeVisible()

  // A non-matching query shows the no-results state.
  await page.getByLabel('بحث داخل ملف العميل').fill('xyz-لا-شيء')
  await expect(page.getByText('لا توجد نتائج')).toBeVisible()
})

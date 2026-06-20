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

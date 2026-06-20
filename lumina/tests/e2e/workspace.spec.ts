import { test, expect } from 'playwright/test'
import path from 'node:path'
import { login, createClient } from './helpers'

const FIXTURE = path.join(__dirname, 'fixtures', 'sample.pdf')

test('contract: create licence contract → generate PDF → download link appears', async ({ page }) => {
  test.slow()
  await login(page)
  await createClient(page)

  // Add a contract from the client tree.
  await page.getByRole('link', { name: 'إضافة عقد' }).first().click()
  await expect(page).toHaveURL(/\/contracts\/new$/, { timeout: 20_000 })

  // Default grant type is a licence — pick coverage + save.
  await page.getByText('التوزيع الرقمي والبث التدفقي').click()
  await page.getByRole('button', { name: 'حفظ العقد' }).click()
  await expect(page).toHaveURL(/\/clients\/[a-z0-9]+$/i, { timeout: 20_000 })

  // Generate the contract PDF.
  await page.getByRole('link', { name: 'إنشاء مستند PDF' }).first().click()
  await expect(page).toHaveURL(/\/generate$/, { timeout: 20_000 })
  await page.getByRole('button', { name: 'إنشاء مسودة العقد' }).click()
  await expect(page.getByRole('link', { name: /تحميل مسودة PDF/ })).toBeVisible({ timeout: 40_000 })
})

test('sale contract: choose تنازل كامل → buyout amount field appears → save', async ({ page }) => {
  test.slow()
  await login(page)
  await createClient(page)
  await page.getByRole('link', { name: 'إضافة عقد' }).first().click()
  await expect(page).toHaveURL(/\/contracts\/new$/, { timeout: 20_000 })

  // Switching to sale & assignment reveals the buyout field and hides % / term.
  await page.selectOption('select[name=grantType]', 'FULL_ASSIGNMENT')
  await expect(page.getByLabel('مبلغ البيع/التنازل', { exact: false })).toBeVisible()
  await expect(page.locator('input[name=revenueSharePct]')).toHaveCount(0)
  await page.getByLabel('مبلغ البيع/التنازل', { exact: false }).fill('10000')
  await page.getByText('التوزيع الرقمي والبث التدفقي').click()
  await page.getByRole('button', { name: 'حفظ العقد' }).click()
  await expect(page).toHaveURL(/\/clients\/[a-z0-9]+$/i, { timeout: 20_000 })
  await expect(page.getByText('تنازل كامل عن الحقوق المالية')).toBeVisible()
})

test('folder: create folder → attach file → download link appears', async ({ page }) => {
  test.slow()
  await login(page)
  await createClient(page)

  // Create a top-level folder (the form's submit button is exactly "إنشاء").
  await page.getByRole('button', { name: 'إنشاء مجلد' }).first().click()
  await page.getByPlaceholder('اسم المجلد').fill('ماسترات')
  await page.getByRole('button', { name: 'إنشاء', exact: true }).click()
  await expect(page.getByText('ماسترات')).toBeVisible({ timeout: 20_000 })

  // Attach a file into the folder and confirm a document download link shows
  // (folder documents link to /documents/[id] using the filename as the label).
  await page.locator('input[type=file]').first().setInputFiles(FIXTURE)
  await page.getByRole('button', { name: 'إرفاق ملف' }).first().click()
  await expect(page.locator('a[href^="/documents/"]').first()).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText('sample.pdf')).toBeVisible()
})

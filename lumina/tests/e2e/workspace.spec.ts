import { test, expect } from 'playwright/test'
import path from 'node:path'
import { login, createClient } from './helpers'

const FIXTURE = path.join(__dirname, 'fixtures', 'sample.pdf')

test('contract: create licence contract → contract detail → generate PDF', async ({ page }) => {
  test.slow()
  await login(page)
  await createClient(page)

  // Add a contract from the client hub header.
  await page.getByRole('link', { name: 'إضافة عقد' }).first().click()
  await expect(page).toHaveURL(/\/contracts\/new$/, { timeout: 20_000 })

  // Default grant type is a licence — pick coverage + save.
  await page.getByText('التوزيع الرقمي والبث التدفقي').click()
  await page.getByRole('button', { name: 'حفظ العقد' }).click()

  // Saving now lands on the focused contract detail page.
  await expect(page).toHaveURL(/\/contracts\/[a-z0-9]+$/i, { timeout: 20_000 })

  // Generate the contract PDF from the contract detail header.
  await page.getByRole('link', { name: 'إنشاء PDF' }).first().click()
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

  // Lands on the contract detail page; its header shows the grant label.
  await expect(page).toHaveURL(/\/contracts\/[a-z0-9]+$/i, { timeout: 20_000 })
  await expect(page.getByRole('heading', { name: 'تنازل كامل عن الحقوق المالية' })).toBeVisible()
})

test('folder: create folder (modal) → attach file (modal) → download link appears', async ({ page }) => {
  test.slow()
  await login(page)
  await createClient(page)

  // Switch to the Folders tab.
  await page.getByRole('tab', { name: 'المجلدات' }).click()

  // Create a top-level folder via the modal dialog (submit button is "إنشاء").
  await page.getByRole('button', { name: 'إنشاء مجلد' }).first().click()
  await page.getByPlaceholder('اسم المجلد').fill('ماسترات')
  await page.getByRole('button', { name: 'إنشاء', exact: true }).click()
  await expect(page.getByText('ماسترات')).toBeVisible({ timeout: 20_000 })

  // Attach a file into the folder via the modal dialog.
  await page.getByRole('button', { name: 'إرفاق ملف' }).first().click()
  await page.locator('input[type=file]').first().setInputFiles(FIXTURE)
  await page.getByRole('button', { name: 'إرفاق', exact: true }).click()

  // The folder now lists the uploaded document, linking to /documents/[id].
  await expect(page.locator('a[href^="/documents/"]').first()).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText('sample.pdf')).toBeVisible()
})

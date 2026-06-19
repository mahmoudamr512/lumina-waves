import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { test, expect } from 'playwright/test'
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from './e2e-admin'

/**
 * End-to-end tests for document upload + search.
 *
 * Upload test: login → upload a fixture file → assert it appears in /documents.
 * This is deterministic: upload → DB write happens synchronously; OCR is best-effort
 * and not required for the document to appear in the list.
 *
 * Search test: index a known document directly via the search library (via tsx child
 * script, no live worker needed), then visit /search?q=... and assert the title appears.
 */

async function login(page: import('playwright/test').Page) {
  await page.goto('/login')
  await page.getByLabel('البريد الإلكتروني').fill(E2E_ADMIN_EMAIL)
  await page.getByLabel('كلمة المرور').fill(E2E_ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click()
  await expect(page).toHaveURL(/\/(clients|documents|search)/, { timeout: 20_000 })
}

test('upload: login → upload fixture → appears in documents list', async ({ page }) => {
  test.slow()

  await login(page)

  // Navigate to upload page
  await page.goto('/documents/upload')
  await expect(page.getByRole('heading', { name: 'رفع مستند', level: 1 })).toBeVisible()

  // Upload the fixture file
  const fixturePath = path.join(__dirname, 'fixtures', 'sample.pdf')
  await page.getByLabel('الملف').setInputFiles(fixturePath)
  await page.getByRole('button', { name: 'رفع المستند' }).click()

  // Should redirect to /documents
  await expect(page).toHaveURL(/\/documents$/, { timeout: 20_000 })

  // The uploaded filename should appear in the list (may have multiple entries from prior runs)
  await expect(page.getByText('sample.pdf').first()).toBeVisible()
})

test('search: indexed document appears in search results', async ({ page }) => {
  test.slow()

  // Seed the search index directly (no worker needed)
  const script = path.join(__dirname, 'provision-search-index.ts')
  execFileSync('npx', ['tsx', script], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..', '..'),
  })

  await login(page)

  // Visit search with the known term
  await page.goto('/search?q=' + encodeURIComponent('وثيقة اختبار'))

  // The indexed document title should appear
  await expect(page.getByText('وثيقة اختبار البحث')).toBeVisible({ timeout: 15_000 })
})

import { test, expect, type Page } from 'playwright/test'
import { login, createClient } from './helpers'

function unique() {
  return Date.now().toString() + Math.floor(performance.now()).toString().slice(-3)
}

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel('البريد الإلكتروني').fill(email)
  await page.getByLabel('كلمة المرور').fill(password)
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click()
}

test('client activity: post, edit, and delete a comment', async ({ page }) => {
  test.slow()
  await login(page)
  await createClient(page) // lands on the client hub

  // Open the Activity tab.
  await page.getByRole('tab', { name: 'النشاط' }).click()
  await expect(page).toHaveURL(/tab=activity/, { timeout: 20_000 })

  // Post a comment.
  const body = `تعليق اختبار ${unique()}`
  await page.getByLabel('تعليق جديد').fill(body)
  await page.getByRole('button', { name: 'إرسال' }).click()
  await expect(page.getByText(body)).toBeVisible({ timeout: 20_000 })

  // Edit it (marks "عُدّل").
  await page.getByRole('button', { name: 'تعديل' }).first().click()
  await page.getByRole('button', { name: 'حفظ' }).first().click()
  await expect(page.getByText('(عُدّل)')).toBeVisible({ timeout: 20_000 })

  // Delete it.
  await page.getByRole('button', { name: 'حذف' }).first().click()
  await expect(page.getByText(body)).toHaveCount(0, { timeout: 20_000 })
})

test('client activity: History tab shows the creation action', async ({ page }) => {
  test.slow()
  await login(page)
  await createClient(page)
  await page.getByRole('tab', { name: 'النشاط' }).click()
  await expect(page).toHaveURL(/tab=activity/, { timeout: 20_000 })
  await page.getByRole('tab', { name: /السجل/ }).click()
  await expect(page.getByText(/أنشأ العميل/).first()).toBeVisible({ timeout: 20_000 })
})

test('global /activity feed loads for an admin', async ({ page }) => {
  test.slow()
  await login(page)
  await page.goto('/activity')
  await expect(page.getByRole('heading', { name: 'سجل النشاط' })).toBeVisible({ timeout: 20_000 })
})

test('global /activity is admin-only (a VIEWER is redirected)', async ({ page, browser }) => {
  test.slow()
  await login(page)
  // Provision a VIEWER through the admin UI.
  const email = `actv${unique()}@e2e.test`
  await page.goto('/users/new')
  await page.getByLabel('الاسم', { exact: false }).fill('مشاهد النشاط')
  await page.getByLabel('البريد الإلكتروني').fill(email)
  await page.getByLabel('الدور').selectOption('VIEWER')
  await page.getByLabel('كلمة المرور المبدئية').fill('viewerpw12345')
  await page.getByRole('button', { name: 'إنشاء المستخدم' }).click()
  await expect(page).toHaveURL(/\/users$/, { timeout: 20_000 })

  const ctx = await browser.newContext()
  const vp = await ctx.newPage()
  await loginAs(vp, email, 'viewerpw12345')
  await expect(vp).toHaveURL(/\/overview$/, { timeout: 20_000 })
  await vp.goto('/activity')
  await expect(vp).toHaveURL(/\/overview$/, { timeout: 20_000 }) // redirected away
  await ctx.close()
})

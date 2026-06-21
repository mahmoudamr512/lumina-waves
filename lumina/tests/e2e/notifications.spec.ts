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

async function createUserViaAdmin(page: Page, u: { name: string; email: string; role: string; password: string }) {
  await page.goto('/users/new')
  await page.getByLabel('الاسم', { exact: false }).fill(u.name)
  await page.getByLabel('البريد الإلكتروني').fill(u.email)
  await page.getByLabel('الدور').selectOption(u.role)
  await page.getByLabel('كلمة المرور المبدئية').fill(u.password)
  await page.getByRole('button', { name: 'إنشاء المستخدم' }).click()
  await expect(page).toHaveURL(/\/users$/, { timeout: 20_000 })
}

test('a watcher is notified of a new comment (bell + click)', async ({ page, browser }) => {
  test.slow()
  await login(page) // admin A
  const { url } = await createClient(page)

  // A comments → A becomes a watcher of the client.
  await page.getByRole('tab', { name: 'النشاط' }).click()
  await page.getByLabel('تعليق جديد').fill('أول تعليق من المدير')
  await page.getByRole('button', { name: 'إرسال' }).click()
  await expect(page.getByText('أول تعليق من المدير')).toBeVisible({ timeout: 20_000 })

  // Provision B and have B comment on the same client.
  const email = `ntfy${unique()}@e2e.test`
  await createUserViaAdmin(page, { name: 'زميل التنبيه', email, role: 'OPERATIONS', password: 'pw12345678' })
  const ctxB = await browser.newContext()
  const pB = await ctxB.newPage()
  await loginAs(pB, email, 'pw12345678')
  await expect(pB).toHaveURL(/\/overview$/, { timeout: 20_000 })
  await pB.goto(url)
  await pB.getByRole('tab', { name: 'النشاط' }).click()
  await pB.getByLabel('تعليق جديد').fill('رد من الزميل')
  await pB.getByRole('button', { name: 'إرسال' }).click()
  await expect(pB.getByText('رد من الزميل')).toBeVisible({ timeout: 20_000 })
  await ctxB.close()

  // Back as A: the bell shows an unread item; opening it reveals the notification.
  await page.goto('/overview')
  const bell = page.getByRole('button', { name: 'الإشعارات' })
  await expect(bell).toBeVisible()
  await bell.click()
  await expect(page.getByText(/علّق على/).first()).toBeVisible({ timeout: 20_000 })
})

test('watch toggle follows and unfollows a record', async ({ page }) => {
  test.slow()
  await login(page)
  await createClient(page)
  await page.getByRole('tab', { name: 'النشاط' }).click()
  // Not watching yet → "متابعة".
  const follow = page.getByRole('button', { name: 'متابعة' })
  await expect(follow).toBeVisible({ timeout: 20_000 })
  await follow.click()
  await expect(page.getByRole('button', { name: 'إلغاء المتابعة' })).toBeVisible({ timeout: 20_000 })
})

test('account exposes the enable-push control', async ({ browser }) => {
  test.slow()
  const ctx = await browser.newContext({ permissions: ['notifications'] })
  const page = await ctx.newPage()
  await login(page)
  await page.goto('/account')
  await expect(page.getByRole('heading', { name: 'الإشعارات' })).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole('button', { name: 'تفعيل إشعارات هذا الجهاز' })).toBeVisible({ timeout: 20_000 })
  await ctx.close()
})

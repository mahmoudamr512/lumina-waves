import { test, expect, type Page } from 'playwright/test'
import { login } from './helpers'

function unique() {
  return Date.now().toString() + Math.floor(performance.now()).toString().slice(-3)
}

/** Create a user through the admin UI. Assumes `page` is logged in as admin. */
async function createUserViaAdmin(
  page: Page,
  u: { name: string; email: string; role: string; password: string },
) {
  await page.goto('/users/new')
  await page.getByLabel('الاسم', { exact: false }).fill(u.name)
  await page.getByLabel('البريد الإلكتروني').fill(u.email)
  await page.getByLabel('الدور').selectOption(u.role)
  await page.getByLabel('كلمة المرور المبدئية').fill(u.password)
  await page.getByRole('button', { name: 'إنشاء المستخدم' }).click()
  await expect(page).toHaveURL(/\/users$/, { timeout: 20_000 })
  await expect(page.getByText(u.email)).toBeVisible({ timeout: 20_000 })
}

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel('البريد الإلكتروني').fill(email)
  await page.getByLabel('كلمة المرور').fill(password)
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click()
}

test('admin can create a user, change role, and disable/enable it', async ({ page }) => {
  test.slow()
  await login(page)
  const email = `u${unique()}@e2e.test`
  await createUserViaAdmin(page, { name: 'مستخدم اختبار', email, role: 'VIEWER', password: 'initpw12345' })

  // Open the new user's detail row.
  await page.locator('tr', { hasText: email }).first().click()
  await expect(page).toHaveURL(/\/users\/[a-z0-9]+$/i, { timeout: 20_000 })

  // Change role to LEGAL and save.
  await page.getByLabel('الدور').selectOption('LEGAL')
  await page.getByRole('button', { name: 'حفظ التعديلات' }).click()
  await expect(page.getByText('تم حفظ التعديلات')).toBeVisible({ timeout: 20_000 })

  // Disable then re-enable.
  await page.getByRole('button', { name: 'تعطيل' }).click()
  await expect(page.getByRole('button', { name: 'تفعيل' })).toBeVisible({ timeout: 20_000 })
  await page.getByRole('button', { name: 'تفعيل' }).click()
  await expect(page.getByRole('button', { name: 'تعطيل' })).toBeVisible({ timeout: 20_000 })
})

test('revoking sessions forces the user to re-login', async ({ page, browser }) => {
  test.slow()
  await login(page)
  const email = `r${unique()}@e2e.test`
  await createUserViaAdmin(page, { name: 'جلسة اختبار', email, role: 'VIEWER', password: 'revokepw12345' })

  // The user logs in from a separate context.
  const userCtx = await browser.newContext()
  const userPage = await userCtx.newPage()
  await loginAs(userPage, email, 'revokepw12345')
  await expect(userPage).toHaveURL(/\/overview$/, { timeout: 20_000 })

  // Admin revokes all of the user's sessions.
  await page.locator('tr', { hasText: email }).first().click()
  await expect(page).toHaveURL(/\/users\/[a-z0-9]+$/i, { timeout: 20_000 })
  await page.getByRole('button', { name: 'إنهاء كل الجلسات' }).click()
  await expect(page.getByText('تم إنهاء كل الجلسات')).toBeVisible({ timeout: 20_000 })

  // The user's next protected navigation bounces to /login.
  await userPage.goto('/clients')
  await expect(userPage).toHaveURL(/\/login/, { timeout: 20_000 })
  await userCtx.close()
})

test('a disabled user cannot log in', async ({ page, browser }) => {
  test.slow()
  await login(page)
  const email = `d${unique()}@e2e.test`
  await createUserViaAdmin(page, { name: 'حساب معطّل', email, role: 'VIEWER', password: 'disabledpw123' })

  await page.locator('tr', { hasText: email }).first().click()
  await expect(page).toHaveURL(/\/users\/[a-z0-9]+$/i, { timeout: 20_000 })
  await page.getByRole('button', { name: 'تعطيل' }).click()
  await expect(page.getByRole('button', { name: 'تفعيل' })).toBeVisible({ timeout: 20_000 })

  const ctx = await browser.newContext()
  const p = await ctx.newPage()
  await loginAs(p, email, 'disabledpw123')
  // Login fails → stays on /login (never reaches /overview).
  await expect(p).toHaveURL(/\/login/, { timeout: 20_000 })
  await ctx.close()
})

test('self-service: a user changes their own password and re-logs in with it', async ({ page, browser }) => {
  test.slow()
  await login(page)
  const email = `s${unique()}@e2e.test`
  await createUserViaAdmin(page, { name: 'تغيير كلمة المرور', email, role: 'VIEWER', password: 'oldpw123456' })

  const ctx = await browser.newContext()
  const p = await ctx.newPage()
  await loginAs(p, email, 'oldpw123456')
  await expect(p).toHaveURL(/\/overview$/, { timeout: 20_000 })

  await p.goto('/account')
  await p.getByLabel('كلمة المرور الحالية').fill('oldpw123456')
  await p.getByLabel('كلمة المرور الجديدة').fill('newpw654321')
  await p.getByLabel('تأكيد كلمة المرور').fill('newpw654321')
  await p.getByRole('button', { name: 'تغيير كلمة المرور' }).click()
  await expect(p.getByText('تم تغيير كلمة المرور')).toBeVisible({ timeout: 20_000 })

  // Log out and log back in with the new password.
  await p.getByRole('button', { name: 'تسجيل الخروج' }).click()
  await expect(p).toHaveURL(/\/login/, { timeout: 20_000 })
  await loginAs(p, email, 'newpw654321')
  await expect(p).toHaveURL(/\/overview$/, { timeout: 20_000 })
  await ctx.close()
})

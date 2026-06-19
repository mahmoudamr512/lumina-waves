import { hashPassword, verifyPassword } from '@/lib/password'

test('hash + verify', async () => {
  const h = await hashPassword('s3cret')
  expect(await verifyPassword('s3cret', h)).toBe(true)
  expect(await verifyPassword('wrong', h)).toBe(false)
})

import { test, expect } from 'playwright/test'

// The PWA manifest + service worker must be publicly fetchable (the proxy
// allow-lists them) so the app is installable.
test('PWA manifest is served and valid', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest')
  expect(res.ok()).toBeTruthy()
  const m = await res.json()
  expect(m.short_name).toBe('Lumina')
  expect(m.display).toBe('standalone')
  expect(Array.isArray(m.icons)).toBeTruthy()
})

test('service worker script is served', async ({ request }) => {
  const res = await request.get('/sw.js')
  expect(res.ok()).toBeTruthy()
  expect(res.headers()['content-type'] ?? '').toContain('javascript')
})

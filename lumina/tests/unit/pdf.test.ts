import { renderPdf } from '@/lib/pdf'
import { layout } from '@/templates/contracts/_layout'

test('renders a non-empty PDF buffer', async () => {
  const buf = await renderPdf(layout({ titleAr: 'عقد', bodyHtml: '<p>اختبار</p>' }))
  expect(buf.subarray(0, 4).toString()).toBe('%PDF')
  expect(buf.length).toBeGreaterThan(1000)
}, 30000)

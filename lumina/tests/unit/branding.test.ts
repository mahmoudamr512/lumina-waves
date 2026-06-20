import { stampSvg, letterheadHtml, signatureBlockHtml, COMPANY } from '@/templates/contracts/branding'

test('gold seal carries both company names, the seal labels, and the gold gradient', () => {
  const svg = stampSvg({ variant: 'gold' })
  expect(svg).toContain(COMPANY.nameEn) // curved top text
  expect(svg).toContain(COMPANY.nameAr) // curved bottom text
  expect(svg).toContain('ختم رسمي')
  expect(svg).toContain('OFFICIAL SEAL')
  expect(svg).toContain('url(#sealGold)')
})

test('ink variant uses a solid blue ink colour, not the gold gradient, for its marks', () => {
  const svg = stampSvg({ variant: 'ink' })
  expect(svg).toContain('#1B3FA0') // official blue ink
  // strokes/text must paint with the ink colour, not the gradient
  expect(svg).toContain('stroke="#1B3FA0"')
  expect(svg).not.toContain('stroke="url(#sealGold)"')
})

test('registration number is rendered and HTML-escaped', () => {
  const svg = stampSvg({ regNo: '4521 / 2024' })
  expect(svg).toContain('4521 / 2024')
  const malicious = stampSvg({ regNo: '<script>x</script>' })
  expect(malicious).not.toContain('<script>x</script>')
  expect(malicious).toContain('&lt;script&gt;')
})

test('letterhead carries the company identity', () => {
  const html = letterheadHtml()
  expect(html).toContain(COMPANY.nameEn)
  expect(html).toContain(COMPANY.nameAr)
})

test('signature block stamps Party 2 with the seal and escapes the Party 1 label', () => {
  const html = signatureBlockHtml({ party1Label: 'A & <b>B</b>', regNo: '1/2024' })
  expect(html).toContain('الطرف الأول')
  expect(html).toContain('الطرف الثاني')
  expect(html).toContain('<svg') // the embedded seal
  expect(html).not.toContain('<b>B</b>')
  expect(html).toContain('A &amp; &lt;b&gt;')
})

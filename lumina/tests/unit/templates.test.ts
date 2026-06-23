import { renderContract, renderAnnex } from '@/templates/contracts'
import { escapeHtml } from '@/templates/contracts/_layout'

test('distribution contract includes correct Arabic grant + moral-rights note', () => {
  const html = renderContract('DISTRIBUTION', {
    party1Name: 'أحمد علاء',
    party1NationalId: '28902102104713',
    territory: 'WORLDWIDE',
    termMonths: 36,
    coverage: ['DIGITAL', 'SYNC'],
  })
  expect(html).toContain('توزيع')
  expect(html).toContain('الحقوق الأدبية') // moral-rights note always present
  expect(html).toContain('المزامنة') // coverage rendered in Arabic
})

const ANNEX_BASE = {
  number: 24,
  masterDateAr: '12 سبتمبر 2018',
  annexDateAr: 'الأحد 17 مايو 2026',
  party1Name: 'أحمد علاء الدين محمد',
  party1StageName: 'أحمد علاء',
  party1NationalId: '28902102104713',
  party1Address: 'الجيزة',
}

test('renderAnnex includes works-table headers and annex framing', () => {
  const html = renderAnnex({
    ...ANNEX_BASE,
    works: [
      {
        titleAr: 'أغنية الوداع',
        singer: 'محمد محي',
        composer: 'عمر خيرت',
        lyricist: 'نجيب سرور',
        arranger: 'أحمد الحجار',
      },
    ],
  })
  expect(html).toContain('الأغنية')
  expect(html).toContain('المطرب')
  expect(html).toContain('المؤلف')
  expect(html).toContain('الملحن')
  expect(html).toContain('الموزع')
  // The title wraps "(24)" in an LTR isolate (U+2066…U+2069) so the parens
  // render correctly in RTL; assert the parts rather than the literal join.
  expect(html).toContain('ملحق رقم')
  expect(html).toContain('(24)')
})

// ── HTML-injection guard tests ────────────────────────────────────────────────

test('escapeHtml escapes all five special characters', () => {
  expect(escapeHtml('A & <b>B</b> "C" \'D\'')).toBe(
    'A &amp; &lt;b&gt;B&lt;/b&gt; &quot;C&quot; &#39;D&#39;',
  )
})

test('renderContract escapes malicious party1Name — raw tags must not appear', () => {
  const html = renderContract('DISTRIBUTION', {
    party1Name: '<script>alert(1)</script>',
    party1NationalId: '12345678901234',
    territory: 'EGYPT',
    termMonths: 12,
    coverage: ['DIGITAL'],
  })
  expect(html).not.toContain('<script>')
  expect(html).not.toContain('</script>')
  expect(html).toContain('&lt;script&gt;')
  expect(html).toContain('&lt;/script&gt;')
})

test('renderContract escapes malicious party1NationalId', () => {
  const html = renderContract('SALE', {
    party1Name: 'سالم محمد',
    party1NationalId: '"><img src=x onerror=alert(1)>',
    territory: 'MENA',
    termMonths: 24,
    coverage: ['DIGITAL'],
  })
  expect(html).not.toContain('<img')
  expect(html).toContain('&quot;&gt;&lt;img')
})

test('renderContract escapes an unknown territory fallback value', () => {
  const html = renderContract('DISTRIBUTION', {
    party1Name: 'فاطمة علي',
    party1NationalId: '29901010100001',
    territory: '<UNKNOWN>',
    termMonths: 6,
    coverage: ['DIGITAL'],
  })
  expect(html).not.toContain('<UNKNOWN>')
  expect(html).toContain('&lt;UNKNOWN&gt;')
})

test('renderAnnex escapes malicious works-table fields — raw tags must not appear', () => {
  const html = renderAnnex({
    ...ANNEX_BASE,
    works: [
      {
        titleAr: 'A & <b>B</b>',
        singer: '<script>alert(1)</script>',
        composer: '"evil"',
        lyricist: "'xss'",
        arranger: '<img src=x>',
      },
    ],
  })
  expect(html).not.toContain('<script>')
  expect(html).not.toContain('<b>')
  expect(html).not.toContain('<img')
  expect(html).toContain('&lt;script&gt;')
  expect(html).toContain('A &amp; &lt;b&gt;B&lt;/b&gt;')
  expect(html).toContain('&quot;evil&quot;')
  expect(html).toContain('&#39;xss&#39;')
})

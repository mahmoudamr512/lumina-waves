import { renderContract, renderAnnex } from '@/templates/contracts'
import { escapeHtml } from '@/templates/contracts/_layout'

test('distribution contract renders correct Arabic grant + moral-rights + WORLDWIDE label', () => {
  const html = renderContract('DISTRIBUTION', {
    party1Name: 'أحمد علاء',
    party1NationalId: '28902102104713',
    territory: 'WORLDWIDE',
    termMonths: 36,
    coverageMode: 'RBT_AND_DIGITAL',
  })
  expect(html).toContain('توزيع')
  expect(html).toContain('الحقوق الأدبية') // moral-rights note always present
  // The Worldwide label now reads «جمهورية مصر العربية وجميع أنحاء العالم».
  expect(html).toContain('جمهورية مصر العربية وجميع أنحاء العالم')
})

test('EGYPT territory renders the correct Arabic label (regression: previously showed raw enum)', () => {
  const html = renderContract('SALE', {
    party1Name: 'محمد علي',
    party1NationalId: '29001011234567',
    territory: 'EGYPT',
    termMonths: 0,
    coverageMode: 'DIGITAL_ONLY',
  })
  expect(html).toContain('جمهورية مصر العربية')
  // Must not fall back to the raw enum key.
  expect(html).not.toMatch(/>\s*EGYPT\s*</)
})

test('RBT_ONLY mode omits the digital-platform paragraph', () => {
  const html = renderContract('SALE', {
    party1Name: 'ن',
    party1NationalId: '12345678901234',
    territory: 'EGYPT',
    termMonths: 0,
    coverageMode: 'RBT_ONLY',
  })
  // fixParens wraps parenthetical text in U+2066…U+2069 LTR isolates, so assert
  // on the parts that survive the transform rather than the literal parenthesis.
  expect(html).toContain('نغمة الانتظار')
  expect(html).toContain('الكول تون')
  expect(html).not.toContain('YouTube')
  expect(html).not.toContain('TikTok')
})

test('DIGITAL_ONLY mode includes the new streaming platforms (IG/TikTok/Anghami/Spotify)', () => {
  const html = renderContract('DISTRIBUTION', {
    party1Name: 'ن',
    party1NationalId: '12345678901234',
    territory: 'WORLDWIDE',
    termMonths: 36,
    coverageMode: 'DIGITAL_ONLY',
  })
  for (const p of ['YouTube', 'YouTube Music', 'Facebook', 'Instagram', 'TikTok', 'Anghami', 'Spotify']) {
    expect(html).toContain(p)
  }
  expect(html).not.toContain('نغمة الانتظار (RBT')
})

test('future-tech clause and email-control undertaking are always present', () => {
  const html = renderContract('SALE', {
    party1Name: 'ن',
    party1NationalId: '12345678901234',
    territory: 'EGYPT',
    termMonths: 0,
    coverageMode: 'RBT_AND_DIGITAL',
  })
  expect(html).toContain('وما يستحدث منها مستقبلًا بأي مسمى أو صورة كانت')
  expect(html).toContain('سيظل تحت سيطرته الكاملة')
})

test('coverage exclusions render as «باستثناء: …» in the granting clause', () => {
  const html = renderContract('DISTRIBUTION', {
    party1Name: 'ن',
    party1NationalId: '12345678901234',
    territory: 'WORLDWIDE',
    termMonths: 36,
    coverageMode: 'RBT_AND_DIGITAL',
    coverageExclusions: ['TikTok', 'Spotify'],
  })
  expect(html).toContain('باستثناء:')
  expect(html).toContain('TikTok')
  expect(html).toContain('Spotify')
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
    coverageMode: 'DIGITAL_ONLY',
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
    territory: 'WORLDWIDE',
    termMonths: 24,
    coverageMode: 'DIGITAL_ONLY',
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
    coverageMode: 'DIGITAL_ONLY',
  })
  expect(html).not.toContain('<UNKNOWN>')
  expect(html).toContain('&lt;UNKNOWN&gt;')
})

test('renderContract escapes malicious coverage exclusions', () => {
  const html = renderContract('SALE', {
    party1Name: 'ن',
    party1NationalId: '12345678901234',
    territory: 'EGYPT',
    termMonths: 0,
    coverageMode: 'RBT_AND_DIGITAL',
    coverageExclusions: ['<script>alert(1)</script>'],
  })
  expect(html).not.toContain('<script>alert')
  expect(html).toContain('&lt;script&gt;')
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

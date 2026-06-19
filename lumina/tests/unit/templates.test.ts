import { renderContract, renderAnnex } from '@/templates/contracts'

test('exclusive license contract includes correct Arabic grant + moral-rights note', () => {
  const html = renderContract('EXCLUSIVE_LICENSE', {
    party1Name: 'أحمد علاء',
    party1NationalId: '28902102104713',
    territory: 'WORLDWIDE',
    termMonths: 36,
    coverage: ['DIGITAL', 'SYNC'],
  })
  expect(html).toContain('ترخيص حصري')
  expect(html).toContain('الحقوق الأدبية') // moral-rights note always present
  expect(html).toContain('المزامنة') // coverage rendered in Arabic
})

test('renderAnnex includes works-table headers', () => {
  const html = renderAnnex({
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
  expect(html).toContain('الموزع الموسيقي')
})

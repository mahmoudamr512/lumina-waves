// tests/unit/rights.test.ts
import { GRANT_TYPES, COVERAGE, validateGrant, MORAL_RIGHTS_NOTE } from '@/lib/rights'
test('grant types carry correct Arabic', () => {
  expect(GRANT_TYPES.FULL_ASSIGNMENT.ar).toBe('تنازل كامل عن الحقوق المالية')
  expect(GRANT_TYPES.EXCLUSIVE_LICENSE.ar).toBe('ترخيص حصري')
})
test('coverage includes sync and RBT with correct Arabic', () => {
  expect(COVERAGE.SYNC.ar).toBe('المزامنة')
  expect(COVERAGE.RBT.ar).toBe('نغمة الانتظار')
})
test('empty coverage is rejected (Article 149)', () => {
  expect(() => validateGrant({ grantType:'EXCLUSIVE_LICENSE', territory:'EGYPT', coverage:[] }))
    .toThrow(/coverage/i)
})
test('moral rights note is non-empty and Arabic', () => {
  expect(MORAL_RIGHTS_NOTE.ar).toContain('الحقوق الأدبية')
})

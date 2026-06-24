// tests/unit/rights.test.ts
import { GRANT_TYPES, COVERAGE, validateGrant, MORAL_RIGHTS_NOTE, TERRITORIES } from '@/lib/rights'
test('grant types carry correct Arabic', () => {
  expect(GRANT_TYPES.SALE.ar).toBe('بيع وتنازل')
  expect(GRANT_TYPES.DISTRIBUTION.ar).toBe('توزيع')
})
test('coverage includes sync and RBT with correct Arabic', () => {
  expect(COVERAGE.SYNC.ar).toBe('المزامنة')
  expect(COVERAGE.RBT.ar).toBe('نغمة الانتظار')
})
test('empty coverage is rejected (Article 149)', () => {
  expect(() => validateGrant({ grantType:'DISTRIBUTION', territory:'EGYPT', coverage:[] }))
    .toThrow(/coverage/i)
})
test('moral rights note is non-empty and Arabic', () => {
  expect(MORAL_RIGHTS_NOTE.ar).toContain('الحقوق الأدبية')
})
test('validateGrant happy path: valid grant with non-empty coverage does not throw', () => {
  expect(() => validateGrant({ grantType:'DISTRIBUTION', territory:'WORLDWIDE', coverage:['DIGITAL','BROADCAST'] }))
    .not.toThrow()
})
test('TERRITORIES exports exactly the two plan-mandated values (Egypt + Worldwide)', () => {
  expect(TERRITORIES).toContain('EGYPT')
  expect(TERRITORIES).toContain('WORLDWIDE')
  expect(TERRITORIES).not.toContain('MENA')
  expect(TERRITORIES).toHaveLength(2)
})

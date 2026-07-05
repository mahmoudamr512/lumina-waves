// tests/unit/rights.test.ts
import { GRANT_TYPES, COVERAGE_MODES, validateGrant, MORAL_RIGHTS_NOTE, TERRITORIES } from '@/lib/rights'
test('grant types carry correct Arabic', () => {
  expect(GRANT_TYPES.SALE.ar).toBe('بيع وتنازل')
  expect(GRANT_TYPES.DISTRIBUTION.ar).toBe('توزيع')
})
test('coverage modes cover RBT-only, digital-only, and both', () => {
  expect(COVERAGE_MODES.RBT_ONLY.ar).toBe('نغمة الانتظار فقط')
  expect(COVERAGE_MODES.DIGITAL_ONLY.ar).toBe('القنوات الرقمية فقط')
  expect(COVERAGE_MODES.RBT_AND_DIGITAL.ar).toBe('نغمة الانتظار والقنوات الرقمية')
})
test('validateGrant rejects an unknown coverage mode', () => {
  expect(() => validateGrant({ grantType:'DISTRIBUTION', territory:'EGYPT', coverageMode:'BOGUS' as never }))
    .toThrow(/coverage mode/i)
})
test('moral rights note is non-empty and Arabic', () => {
  expect(MORAL_RIGHTS_NOTE.ar).toContain('الحقوق الأدبية')
})
test('validateGrant happy path: all three modes are valid', () => {
  for (const mode of ['RBT_ONLY','DIGITAL_ONLY','RBT_AND_DIGITAL'] as const) {
    expect(() => validateGrant({ grantType:'DISTRIBUTION', territory:'WORLDWIDE', coverageMode: mode }))
      .not.toThrow()
  }
})
test('TERRITORIES exports exactly the two plan-mandated values (Egypt + Worldwide)', () => {
  expect(TERRITORIES).toContain('EGYPT')
  expect(TERRITORIES).toContain('WORLDWIDE')
  expect(TERRITORIES).not.toContain('MENA')
  expect(TERRITORIES).toHaveLength(2)
})

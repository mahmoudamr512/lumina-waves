// tests/unit/authz.test.ts
import { can, redactSensitive } from '@/lib/authz'
test('only admin can purge', () => {
  expect(can('ADMIN','purge','Trash')).toBe(true)
  expect(can('LEGAL','purge','Trash')).toBe(false)
})
test('operations cannot read financial terms', () => {
  const row = { id:'1', revenueShareBps: 7000, nationalId:'123' } as any
  expect(redactSensitive('OPERATIONS','MasterContract',row).revenueShareBps).toBeNull()
  expect(redactSensitive('FINANCE','MasterContract',{...row}).revenueShareBps).toBe(7000)
})
test('operations cannot read national id', () => {
  expect(redactSensitive('VIEWER','Client',{ nationalId:'123' } as any).nationalId).toBeNull()
})

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

// (a) Trash is ADMIN-only — LEGAL and FINANCE are also blocked
test('Trash is ADMIN-only: LEGAL and FINANCE cannot create or read it', () => {
  expect(can('LEGAL','create','Trash')).toBe(false)
  expect(can('FINANCE','read','Trash')).toBe(false)
})

// (b) Redaction covers minPayoutCents (MasterContract) and storagePath (Document)
test('OPERATIONS and VIEWER have minPayoutCents and storagePath redacted', () => {
  const contract = { minPayoutCents: 5000 } as any
  expect(redactSensitive('OPERATIONS','MasterContract', contract).minPayoutCents).toBeNull()
  expect(redactSensitive('VIEWER','MasterContract', { ...contract }).minPayoutCents).toBeNull()

  const doc = { storagePath: '/files/secret.pdf' } as any
  expect(redactSensitive('OPERATIONS','Document', doc).storagePath).toBeNull()
  expect(redactSensitive('VIEWER','Document', { ...doc }).storagePath).toBeNull()
})

// (c) LEGAL and FINANCE can see sensitive fields (spec: hidden from OPERATIONS+VIEWER only)
test('LEGAL and FINANCE can see sensitive fields — no redaction', () => {
  expect(redactSensitive('LEGAL','Client',{ nationalId:'x' } as any).nationalId).toBe('x')
  expect(redactSensitive('FINANCE','MasterContract',{ revenueShareBps: 7000 } as any).revenueShareBps).toBe(7000)
})

// (d) Fail-closed: unknown/future role string gets sensitive fields redacted
test('fail-closed: unknown role triggers redaction', () => {
  const row = { nationalId: 'abc' } as any
  expect(redactSensitive('UNKNOWN_ROLE' as any, 'Client', row).nationalId).toBeNull()
})

// (e) redactSensitive does NOT mutate its input
test('redactSensitive does not mutate input object', () => {
  const original = { nationalId: 'abc' } as any
  redactSensitive('OPERATIONS', 'Client', original)
  expect(original.nationalId).toBe('abc')
})

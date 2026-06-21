import { can } from '@/lib/authz'

test('User entity is ADMIN-only across all actions', () => {
  for (const a of ['create', 'read', 'update', 'delete'] as const) {
    expect(can('ADMIN', a, 'User')).toBe(true)
    expect(can('LEGAL', a, 'User')).toBe(false)
    expect(can('OPERATIONS', a, 'User')).toBe(false)
    expect(can('FINANCE', a, 'User')).toBe(false)
    expect(can('VIEWER', a, 'User')).toBe(false)
  }
})

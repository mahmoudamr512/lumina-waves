import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  usePathname: () => '/clients',
}))
vi.mock('@/lib/session-actions', () => ({
  signOutAction: vi.fn(),
}))
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))
vi.mock('@/components/brand', () => ({
  LuminaLogo: () => <div data-testid="logo" />,
}))
vi.mock('@/components/pwa/LocaleSwitcher', () => ({
  LocaleSwitcher: () => <div data-testid="locale" />,
}))
vi.mock('@/lib/arabic', () => ({
  ROLE_LABELS: { ADMIN: 'مدير' },
}))

import { Sidebar } from '@/components/ui/Sidebar'

describe('Sidebar', () => {
  const items = [
    { href: '/clients', key: 'clients', icon: <svg /> },
    { href: '/contracts', key: 'contracts', icon: <svg /> },
  ]

  it('marks the active link with aria-current', () => {
    // role is typed Role; cast through unknown for the test.
    render(<Sidebar name="Amr" role={'ADMIN' as never} items={items} />)
    const links = screen.getAllByRole('link', { name: 'clients' })
    // Desktop + mobile drawer not open → only desktop rail renders the nav once
    expect(links.some((l) => l.getAttribute('aria-current') === 'page')).toBe(true)
  })
})

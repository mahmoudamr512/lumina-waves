import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  usePathname: () => '/clients/abc',
  useSearchParams: () => new URLSearchParams(''),
}))

import { Tabs } from '@/components/ui/Tabs'

describe('Tabs', () => {
  const tabs = [
    { key: 'contracts', label: 'Contracts' },
    { key: 'releases', label: 'Releases' },
  ]

  it('marks the active tab and builds ?tab= links', () => {
    render(<Tabs tabs={tabs} active="contracts" />)
    const active = screen.getByRole('tab', { name: 'Contracts' })
    expect(active).toHaveAttribute('aria-selected', 'true')
    const other = screen.getByRole('tab', { name: 'Releases' })
    expect(other).toHaveAttribute('href', '/clients/abc?tab=releases')
  })
})

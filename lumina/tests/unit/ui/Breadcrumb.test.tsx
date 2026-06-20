import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'

describe('Breadcrumb', () => {
  it('last item is current and unlinked', () => {
    render(<Breadcrumb items={[{ label: 'Clients', href: '/clients' }, { label: 'Acme' }]} />)
    expect(screen.getByRole('link', { name: 'Clients' })).toHaveAttribute('href', '/clients')
    expect(screen.getByText('Acme')).toHaveAttribute('aria-current', 'page')
  })
})

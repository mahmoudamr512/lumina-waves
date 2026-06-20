import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

describe('EmptyState', () => {
  it('renders title and action', () => {
    render(<EmptyState title="No clients" action={<button>Add</button>} />)
    expect(screen.getByText('No clients')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
  })
})

describe('Skeleton', () => {
  it('renders a pulsing block', () => {
    const { container } = render(<Skeleton className="h-4" />)
    expect(container.firstChild).toHaveClass('animate-pulse')
  })
})

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge, statusVariant } from '@/components/ui/Badge'

describe('statusVariant', () => {
  it('maps domain statuses to variants', () => {
    expect(statusVariant('EXECUTED')).toBe('success')
    expect(statusVariant('LINKED')).toBe('success')
    expect(statusVariant('RELEASED')).toBe('success')
    expect(statusVariant('PENDING_ANNEX')).toBe('warning')
    expect(statusVariant('DRAFT')).toBe('neutral')
    expect(statusVariant('PLANNED')).toBe('neutral')
    expect(statusVariant('something-else')).toBe('neutral')
  })
})

describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge variant={statusVariant('DRAFT')}>Draft</Badge>)
    expect(screen.getByText('Draft')).toBeInTheDocument()
  })
})

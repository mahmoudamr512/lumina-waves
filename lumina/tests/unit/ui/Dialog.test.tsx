import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

import { Dialog } from '@/components/ui/Dialog'

describe('Dialog', () => {
  it('renders when open and closes on ESC', () => {
    const onClose = vi.fn()
    render(
      <Dialog open title="Add" onClose={onClose}>
        <p>Body</p>
      </Dialog>,
    )
    expect(screen.getByRole('dialog', { name: 'Add' })).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('renders nothing when closed', () => {
    render(
      <Dialog open={false} title="Add" onClose={() => {}}>
        <p>Body</p>
      </Dialog>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

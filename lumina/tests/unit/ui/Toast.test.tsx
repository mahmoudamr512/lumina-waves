import { describe, it, expect } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ToastProvider, useToast } from '@/components/ui/Toast'

function Trigger() {
  const { toast } = useToast()
  return <button onClick={() => toast({ title: 'Saved' })}>go</button>
}

describe('Toast', () => {
  it('shows a toast on demand', () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    )
    act(() => {
      screen.getByText('go').click()
    })
    expect(screen.getByText('Saved')).toBeInTheDocument()
  })
})

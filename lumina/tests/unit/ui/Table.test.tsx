import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Table, TBody, TR, TD } from '@/components/ui/Table'

describe('Table', () => {
  it('renders a linkable row pointing at href', () => {
    render(
      <Table>
        <TBody>
          <TR href="/clients/1">
            <TD>Acme</TD>
            <TD>Active</TD>
          </TR>
        </TBody>
      </Table>,
    )
    expect(screen.getByRole('link', { name: 'Acme' })).toHaveAttribute('href', '/clients/1')
    expect(screen.getByText('Active')).toBeInTheDocument()
  })
})

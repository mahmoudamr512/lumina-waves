import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Field, Input } from '@/components/ui/Field'

describe('Field', () => {
  it('associates label and shows error', () => {
    render(
      <Field label="Name" htmlFor="name" error="Required">
        <Input id="name" />
      </Field>,
    )
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByText('Required')).toBeInTheDocument()
  })
})

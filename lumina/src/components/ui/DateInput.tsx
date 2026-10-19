'use client'

import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { Input } from './Field'

/** Date input that opens the native picker on any click, not just the tiny icon. */
export function DateInput({ className, onClick, ...p }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return (
    <Input
      {...p}
      type="date"
      className={cn('cursor-pointer', className)}
      onClick={(e) => {
        // showPicker throws if the input is disabled/readOnly or the call isn't user-initiated
        try {
          e.currentTarget.showPicker?.()
        } catch {}
        onClick?.(e)
      }}
    />
  )
}

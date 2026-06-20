import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'gold'

const STYLES: Record<Variant, string> = {
  neutral: 'bg-white/5 text-muted',
  info: 'bg-info/15 text-info',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/15 text-danger',
  gold: 'bg-gold-400/15 text-gold-200',
}

export function Badge({ variant = 'neutral', children }: { variant?: Variant; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        STYLES[variant],
      )}
    >
      {children}
    </span>
  )
}

/**
 * Maps the domain status enums (WorkStatus, DocStatus, ReleaseStatus) to a Badge
 * variant. Values come from prisma/schema.prisma; unknown values fall back to
 * neutral.
 */
export function statusVariant(status: string): Variant {
  switch (status.toUpperCase()) {
    case 'EXECUTED':
    case 'LINKED':
    case 'RELEASED':
      return 'success'
    case 'PENDING_ANNEX':
      return 'warning'
    case 'DRAFT':
    case 'PLANNED':
      return 'neutral'
    default:
      return 'neutral'
  }
}

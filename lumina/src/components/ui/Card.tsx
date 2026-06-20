import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Card({
  children,
  className,
  as: As = 'div',
  interactive,
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'article' | 'section'
  interactive?: boolean
}) {
  return (
    <As
      className={cn(
        'rounded-xl border border-line bg-surface',
        interactive && 'transition hover:border-line-strong hover:bg-surface-raised',
        className,
      )}
    >
      {children}
    </As>
  )
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 border-b border-line px-5 py-4', className)}>
      {children}
    </div>
  )
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>
}

export function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('border-t border-line px-5 py-3', className)}>{children}</div>
}

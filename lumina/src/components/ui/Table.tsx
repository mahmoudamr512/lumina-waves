import Link from 'next/link'
import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type TdHTMLAttributes,
} from 'react'
import { cn } from '@/lib/cn'

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className={cn('w-full text-sm', className)}>{children}</table>
    </div>
  )
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-line text-start text-xs uppercase tracking-wider text-subtle">
      {children}
    </thead>
  )
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>
}

export function TH({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn('px-4 py-3 text-start font-medium', className)}>{children}</th>
}

export function TD({ children, className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('px-4 py-3 align-middle text-foreground', className)} {...rest}>
      {children}
    </td>
  )
}

/**
 * A table row. When `href` is set the entire row becomes a link: a stretched
 * anchor is injected into the first cell (valid HTML, keyboard accessible).
 * Cells that need their own interactive controls should set
 * `className="relative z-10"` so they sit above the stretched link.
 */
export function TR({
  href,
  children,
  className,
}: {
  href?: string
  children: ReactNode
  className?: string
}) {
  if (!href) {
    return <tr className={cn('border-b border-line last:border-0', className)}>{children}</tr>
  }

  const childArr = Children.toArray(children)
  const [first, ...rest] = childArr
  const firstWithLink = isValidElement(first)
    ? cloneElement(
        first as ReactElement<{ children?: ReactNode }>,
        undefined,
        <Link
          href={href}
          className="rounded after:absolute after:inset-0 after:content-[''] focus-ring"
        >
          {(first as ReactElement<{ children?: ReactNode }>).props.children}
        </Link>,
      )
    : first

  return (
    <tr
      className={cn(
        'relative border-b border-line transition last:border-0 hover:bg-surface-raised',
        className,
      )}
    >
      {firstWithLink}
      {rest}
    </tr>
  )
}

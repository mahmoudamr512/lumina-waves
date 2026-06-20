import type { ReactNode } from 'react'
import { AmbientBackground } from './AmbientBackground'

/**
 * Authenticated app chrome: ambient backdrop + persistent sidebar (the `nav`
 * slot, on the inline-start / right under RTL) beside a scrollable content
 * column. Each page renders its own Breadcrumb at the top of its content, so the
 * shell only provides the frame. Wrap call sites in a ToastProvider above this.
 */
export function AppSidebarShell({ nav, children }: { nav: ReactNode; children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh">
      <AmbientBackground />
      {nav}
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  )
}

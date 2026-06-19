import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { AppNav } from '@/components/layout/AppNav'
import { AppShell } from '@/components/layout'

/**
 * Authenticated app shell. Server-side session guard (defence in depth beyond
 * the proxy): if there is no session we redirect to /login. Delegates chrome
 * (ambient backdrop + sticky header wrapper) to AppShell, injecting the full
 * AppNav via the optional `nav` slot so the home page is not affected.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <AppShell
      nav={
        <AppNav
          name={session.user.name ?? session.user.email ?? 'مستخدم'}
          role={session.user.role}
        />
      }
    >
      {children}
    </AppShell>
  )
}

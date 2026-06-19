import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { AppNav } from '@/components/layout/AppNav'
import { AmbientBackground } from '@/components/layout'

/**
 * Authenticated app shell. Server-side session guard (defence in depth beyond
 * the proxy): if there is no session we redirect to /login. Renders the
 * branded ambient backdrop + the top navigation carrying the logo, section
 * links, the signed-in user's name/role and a sign-out control.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="relative flex min-h-full flex-col">
      <AmbientBackground />
      <AppNav
        name={session.user.name ?? session.user.email ?? 'مستخدم'}
        role={session.user.role}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  )
}

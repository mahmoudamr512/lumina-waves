import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { AppSidebarShell } from '@/components/layout'
import {
  Sidebar,
  ToastProvider,
  IconOverview,
  IconClients,
  IconContracts,
  IconWorks,
  IconDocuments,
  IconSearch,
  type SidebarItem,
} from '@/components/ui'

const NAV_ITEMS: SidebarItem[] = [
  { href: '/overview', key: 'overview', icon: <IconOverview /> },
  { href: '/clients', key: 'clients', icon: <IconClients /> },
  { href: '/contracts', key: 'contracts', icon: <IconContracts /> },
  { href: '/works', key: 'works', icon: <IconWorks /> },
  { href: '/documents', key: 'documents', icon: <IconDocuments /> },
  { href: '/search', key: 'search', icon: <IconSearch /> },
]

/**
 * Authenticated app shell. Server-side session guard (defence in depth beyond
 * the proxy): if there is no session we redirect to /login. Renders the
 * persistent Sidebar inside AppSidebarShell and provides the toast context to
 * every page.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <ToastProvider>
      <AppSidebarShell
        nav={
          <Sidebar
            name={session.user.name ?? session.user.email ?? 'مستخدم'}
            role={session.user.role}
            items={NAV_ITEMS}
          />
        }
      >
        {children}
      </AppSidebarShell>
    </ToastProvider>
  )
}

import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { loadSession } from '@/lib/session'
import { db } from '@/lib/db'
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
  IconUsers,
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
  // loadSession enforces the revocable session (revoked/expired/disabled → null).
  const s = await loadSession()
  if (!s) redirect('/login')
  const me = await db.user.findUnique({
    where: { id: s.id },
    select: { name: true, email: true, avatarPath: true },
  })

  // Admin-only User Management nav entry.
  const items: SidebarItem[] =
    s.role === 'ADMIN'
      ? [...NAV_ITEMS, { href: '/users', key: 'users', icon: <IconUsers /> }]
      : NAV_ITEMS

  return (
    <ToastProvider>
      <AppSidebarShell
        nav={
          <Sidebar
            name={me?.name ?? me?.email ?? 'مستخدم'}
            role={s.role}
            items={items}
            avatarUrl={me?.avatarPath ? `/avatars/${s.id}` : undefined}
          />
        }
      >
        {children}
      </AppSidebarShell>
    </ToastProvider>
  )
}

import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { can } from '@/lib/authz'
import { getClientTree } from '@/services/clients'
import { FadeIn } from '@/components/motion'
import { Breadcrumb, Tabs, buttonClasses, IconLock, IconPlus } from '@/components/ui'
import { ContractsTab } from './_tabs/ContractsTab'
import { ReleasesTab } from './_tabs/ReleasesTab'
import { FoldersTab } from './_tabs/FoldersTab'
import { DocumentsTab } from './_tabs/DocumentsTab'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) return {}
  const tree = await getClientTree(id)
  const name = tree?.stageName ?? tree?.legalName ?? id
  return { title: `${name} | Lumina Waves` }
}

export type ClientTree = NonNullable<Awaited<ReturnType<typeof getClientTree>>>

const TABS = [
  { key: 'contracts', label: 'العقود' },
  { key: 'releases', label: 'الإصدارات' },
  { key: 'folders', label: 'المجلدات' },
  { key: 'documents', label: 'المستندات' },
]

/**
 * Client hub (RSC). A persistent header (identity + redaction state + primary
 * action) sits above a tab strip; each tab renders only its own hierarchy so the
 * page is no longer a single wall of nested content. Sensitive fields are
 * redacted server-side by getClientTree.
 */
export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab } = await searchParams
  const session = await auth()
  if (!session?.user) redirect('/login')
  const role = session.user.role

  const tree = await getClientTree(id)
  if (!tree) notFound()

  const canGenerate = can(role, 'create', 'Document') && ['ADMIN', 'LEGAL'].includes(role)
  const canCreateContract =
    can(role, 'create', 'MasterContract') && ['ADMIN', 'LEGAL', 'OPERATIONS'].includes(role)
  const canAttach = can(role, 'create', 'Document')
  const canAddRelease = can(role, 'create', 'Work')
  const title = tree.stageName ?? tree.legalName
  const active = TABS.some((t) => t.key === tab) ? tab! : 'contracts'

  return (
    <section className="space-y-8">
      <Breadcrumb items={[{ label: 'نظرة عامة', href: '/overview' }, { label: 'العملاء', href: '/clients' }, { label: title }]} />

      <FadeIn>
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
          <div className="space-y-1.5">
            <h1 className="font-display text-3xl font-semibold text-gold-metallic">{title}</h1>
            {tree.stageName && tree.stageName !== tree.legalName && (
              <p className="text-base text-muted">{tree.legalName}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-sm text-muted">
              {tree.nationalId ? (
                <span dir="ltr" className="font-mono tabular-nums">
                  {tree.nationalId}
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-0.5 text-xs"
                  title="غير مصرّح لك بعرض هذه البيانات"
                >
                  <IconLock className="h-3 w-3" />
                  محجوب
                </span>
              )}
              {tree.phone && <span>{tree.phone}</span>}
              {tree.address && <span>{tree.address}</span>}
            </div>
          </div>
          {canCreateContract && (
            <Link href={`/clients/${id}/contracts/new`} className={buttonClasses('primary')}>
              <IconPlus className="h-4 w-4" /> إضافة عقد
            </Link>
          )}
        </header>
      </FadeIn>

      <Tabs tabs={TABS} active={active} />

      {active === 'contracts' && (
        <ContractsTab
          clientId={id}
          contracts={tree.contracts}
          canCreateContract={canCreateContract}
          canGenerate={canGenerate}
        />
      )}
      {active === 'releases' && (
        <ReleasesTab clientId={id} releases={tree.releases} canAddRelease={canAddRelease} />
      )}
      {active === 'folders' && (
        <FoldersTab clientId={id} folders={tree.folders} canAttach={canAttach} />
      )}
      {active === 'documents' && <DocumentsTab contracts={tree.contracts} folders={tree.folders} />}
    </section>
  )
}

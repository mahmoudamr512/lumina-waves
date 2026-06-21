import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { can } from '@/lib/authz'
import { db } from '@/lib/db'
import { FadeIn } from '@/components/motion'
import { Breadcrumb, Table, THead, TBody, TR, TH, TD, Badge, EmptyState, buttonClasses, statusVariant, IconDocuments, IconPlus } from '@/components/ui'
import { DOC_STATUS_AR, formatDateAr } from '@/lib/labels'

export const metadata = {
  title: 'المستندات | Lumina Waves',
}

export const dynamic = 'force-dynamic'

/**
 * Returns a short Arabic label describing where a document is attached. The
 * `contract`/`annex` context is only present for ADMIN/LEGAL (sensitive docs);
 * for other roles those keys are absent and we fall back to folder or a dash.
 */
function contextLabel(doc: {
  contract?: { client: { stageName: string | null; legalName: string } | null } | null
  annex?: { number: number } | null
  folder: { name: string } | null
}): string {
  if (doc.annex) return `ملحق رقم ${doc.annex.number}`
  if (doc.contract?.client) return `عقد: ${doc.contract.client.stageName ?? doc.contract.client.legalName}`
  if (doc.folder) return `مجلد: ${doc.folder.name}`
  return '—'
}

export default async function DocumentsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const role = session.user.role
  const canCreate = can(role, 'create', 'Document')

  // Contract/annex documents are ADMIN/LEGAL-only at download (see the
  // documents/[docId] route). Only surface their client/annex context to those
  // same roles so the list doesn't re-expose an association the download hides.
  const canSeeSensitiveContext = ['ADMIN', 'LEGAL'].includes(role)

  // storagePath intentionally excluded everywhere — never expose raw fs paths.
  // Two explicit selects (a conditional spread defeats Prisma's select
  // inference and silently widens to the full contract row).
  const documents = canSeeSensitiveContext
    ? await db.document.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          filename: true,
          status: true,
          createdAt: true,
          folder: { select: { name: true } },
          contract: { select: { client: { select: { stageName: true, legalName: true } } } },
          annex: { select: { number: true } },
        },
      })
    : await db.document.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          filename: true,
          status: true,
          createdAt: true,
          folder: { select: { name: true } },
        },
      })

  return (
    <section className="space-y-8">
      <Breadcrumb items={[{ label: 'نظرة عامة', href: '/overview' }, { label: 'المستندات' }]} />

      <FadeIn>
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
          <div className="space-y-1">
            <h1 className="font-display text-3xl font-semibold text-gold-metallic">المستندات</h1>
            <p className="text-sm text-muted">
              {documents.length > 0 ? `${documents.length} مستند` : 'إدارة مستندات لومينا ويفز'}
            </p>
          </div>
          {canCreate && (
            <Link href="/documents/upload" className={buttonClasses('primary')}>
              <IconPlus className="h-4 w-4" /> رفع مستند
            </Link>
          )}
        </header>
      </FadeIn>

      {documents.length === 0 ? (
        <EmptyState
          icon={<IconDocuments className="h-6 w-6" />}
          title="لا توجد مستندات بعد"
          body="ابدأ برفع أول مستند إلى النظام."
          action={
            canCreate ? (
              <Link href="/documents/upload" className={buttonClasses('primary')}>
                <IconPlus className="h-4 w-4" /> رفع مستند
              </Link>
            ) : undefined
          }
        />
      ) : (
        <FadeIn delay={0.05}>
          <Table>
            <THead>
              <tr>
                <TH>الملف</TH>
                <TH>السياق</TH>
                <TH>الحالة</TH>
                <TH>التاريخ</TH>
                <TH>النشاط</TH>
              </tr>
            </THead>
            <TBody>
              {documents.map((doc) => (
                <TR key={doc.id}>
                  <TD>
                    <a
                      href={`/documents/${doc.id}`}
                      className="rounded text-foreground underline-offset-2 transition hover:text-gold-200 hover:underline focus-ring"
                    >
                      {doc.filename}
                    </a>
                  </TD>
                  <TD className="text-muted">{contextLabel(doc)}</TD>
                  <TD>
                    <Badge variant={statusVariant(doc.status)}>{DOC_STATUS_AR[doc.status] ?? doc.status}</Badge>
                  </TD>
                  <TD className="text-muted">{formatDateAr(doc.createdAt)}</TD>
                  <TD>
                    <Link
                      href={`/documents/${doc.id}/activity`}
                      className="rounded text-sm text-gold-200 underline-offset-2 hover:underline focus-ring"
                    >
                      النشاط
                    </Link>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </FadeIn>
      )}
    </section>
  )
}

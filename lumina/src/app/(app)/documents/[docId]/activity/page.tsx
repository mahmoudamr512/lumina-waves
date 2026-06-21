import { redirect, notFound } from 'next/navigation'
import { loadSession } from '@/lib/session'
import { can } from '@/lib/authz'
import { db } from '@/lib/db'
import { getEntityPanel } from '@/services/activity-panel'
import { FadeIn } from '@/components/motion'
import { Breadcrumb, Card, CardBody } from '@/components/ui'
import { ActivityPanel } from '@/components/activity/ActivityPanel'

export const metadata = { title: 'نشاط المستند | Lumina Waves' }
export const dynamic = 'force-dynamic'

export default async function DocumentActivityPage({ params }: { params: Promise<{ docId: string }> }) {
  const { docId } = await params
  const s = await loadSession()
  if (!s) redirect('/login')
  if (!can(s.role, 'read', 'Document')) redirect('/overview')

  const doc = await db.document.findUnique({ where: { id: docId }, select: { filename: true } })
  if (!doc) notFound()
  const panel = await getEntityPanel('Document', docId)

  return (
    <section className="space-y-8">
      <Breadcrumb
        items={[
          { label: 'نظرة عامة', href: '/overview' },
          { label: 'المستندات', href: '/documents' },
          { label: doc.filename },
        ]}
      />
      <FadeIn>
        <header className="space-y-1 border-b border-line pb-5">
          <h1 className="font-display text-2xl font-semibold text-gold-metallic">نشاط المستند</h1>
          <p className="text-sm text-muted" dir="auto">{doc.filename}</p>
        </header>
      </FadeIn>
      <Card>
        <CardBody>
          <ActivityPanel
            entity="Document"
            entityId={docId}
            path={`/documents/${docId}/activity`}
            activity={panel.activity}
            comments={panel.comments}
            isAdmin={panel.isAdmin}
          />
        </CardBody>
      </Card>
    </section>
  )
}

import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { can } from '@/lib/authz'
import { db } from '@/lib/db'
import { GRANT_TYPES } from '@/lib/rights'
import { FadeIn } from '@/components/motion'
import { Breadcrumb } from '@/components/ui'
import { UploadDocumentForm, type ClientOption } from './UploadDocumentForm'

export const metadata = {
  title: 'رفع مستند | Lumina Waves',
}

export const dynamic = 'force-dynamic'

export default async function UploadDocumentPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const role = session.user.role

  // Build client → contract → annex options for the dependent pickers, only when
  // the user may read contracts. Labels are non-sensitive (no redacted fields).
  let clients: ClientOption[] = []
  if (can(role, 'read', 'MasterContract')) {
    const rows = await db.client.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        stageName: true,
        legalName: true,
        contracts: {
          where: { deletedAt: null },
          select: {
            id: true,
            grantType: true,
            annexes: { where: { deletedAt: null }, orderBy: { number: 'asc' }, select: { id: true, number: true } },
          },
        },
      },
    })
    clients = rows.map((c) => ({
      id: c.id,
      label: c.stageName ?? c.legalName,
      contracts: c.contracts.map((ct) => ({
        id: ct.id,
        label: GRANT_TYPES[ct.grantType as keyof typeof GRANT_TYPES]?.ar ?? String(ct.grantType),
        annexes: ct.annexes.map((a) => ({ id: a.id, label: `ملحق رقم ${a.number}` })),
      })),
    }))
  }

  return (
    <section className="mx-auto max-w-xl space-y-8">
      <Breadcrumb items={[{ label: 'نظرة عامة', href: '/overview' }, { label: 'المستندات', href: '/documents' }, { label: 'رفع مستند' }]} />

      <FadeIn>
        <header className="space-y-1 border-b border-line pb-5">
          <h1 className="font-display text-3xl font-semibold text-gold-metallic">رفع مستند</h1>
          <p className="text-sm text-muted">ارفع ملفًا لبدء عملية التعرّف الضوئي على النص وفهرسته.</p>
        </header>
      </FadeIn>
      <FadeIn delay={0.1}>
        <UploadDocumentForm clients={clients} />
      </FadeIn>
    </section>
  )
}

import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getClient } from '@/services/clients'
import { FadeIn } from '@/components/motion'
import { Breadcrumb } from '@/components/ui'
import AddWorkForm from './AddWorkForm'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return { title: 'إضافة عمل | Lumina Waves' }
}

export default async function AddWorkPage({
  params,
}: {
  params: Promise<{ id: string; annexId: string }>
}) {
  const { id, annexId } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')

  const [client, annex] = await Promise.all([
    getClient(id),
    db.annex.findUnique({ where: { id: annexId }, select: { number: true, contractId: true } }),
  ])
  if (!client || !annex) notFound()
  const clientName = client.stageName ?? client.legalName
  const contractId = String(annex.contractId)

  return (
    <section className="mx-auto max-w-2xl space-y-8">
      <Breadcrumb
        items={[
          { label: 'نظرة عامة', href: '/overview' },
          { label: 'العملاء', href: '/clients' },
          { label: clientName, href: `/clients/${id}` },
          { label: 'العقد', href: `/contracts/${contractId}` },
          { label: `ملحق رقم ${annex.number} — إضافة عمل` },
        ]}
      />

      <FadeIn>
        <header className="border-b border-line pb-6">
          <h1 className="font-display text-3xl font-semibold text-gold-metallic">إضافة عمل موسيقي</h1>
          <p className="mt-1 text-sm text-muted">أدخل عنوان العمل وبيانات أصحاب الحقوق.</p>
        </header>
      </FadeIn>
      <FadeIn delay={0.1}>
        <AddWorkForm clientId={id} annexId={annexId} contractId={contractId} />
      </FadeIn>
    </section>
  )
}

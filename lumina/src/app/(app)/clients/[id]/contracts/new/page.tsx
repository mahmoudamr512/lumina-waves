import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getClient } from '@/services/clients'
import { GRANT_TYPES, COVERAGE_MODES } from '@/lib/rights'
import { FadeIn } from '@/components/motion'
import { Breadcrumb } from '@/components/ui'
import NewContractForm from './NewContractForm'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return { title: 'عقد جديد | Lumina Waves' }
}

export default async function NewContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')

  const client = await getClient(id)
  if (!client) notFound()
  const clientName = client.stageName ?? client.legalName

  return (
    <section className="mx-auto max-w-2xl space-y-8">
      <Breadcrumb
        items={[
          { label: 'نظرة عامة', href: '/overview' },
          { label: 'العملاء', href: '/clients' },
          { label: clientName, href: `/clients/${id}` },
          { label: 'عقد جديد' },
        ]}
      />

      <FadeIn>
        <header className="border-b border-line pb-6">
          <h1 className="font-display text-3xl font-semibold text-gold-metallic">إضافة عقد جديد</h1>
          <p className="mt-1 text-sm text-muted">أدخل تفاصيل العقد وصور الاستغلال المطلوبة.</p>
        </header>
      </FadeIn>
      <FadeIn delay={0.1}>
        <NewContractForm clientId={id} grantTypes={GRANT_TYPES} coverageModes={COVERAGE_MODES} />
      </FadeIn>
    </section>
  )
}

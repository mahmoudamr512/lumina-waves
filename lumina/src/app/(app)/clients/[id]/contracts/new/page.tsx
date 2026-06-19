import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { GRANT_TYPES, COVERAGE } from '@/lib/rights'
import { FadeIn } from '@/components/motion'
import NewContractForm from './NewContractForm'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return { title: 'عقد جديد | Lumina Waves' }
}

export default async function NewContractPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <section className="mx-auto max-w-2xl space-y-8">
      <FadeIn>
        <header className="border-b border-border-elevation pb-6">
          <h1 className="font-display text-3xl font-semibold text-gold-metallic">إضافة عقد جديد</h1>
          <p className="mt-1 text-sm text-muted">أدخل تفاصيل العقد وصور الاستغلال المطلوبة.</p>
        </header>
      </FadeIn>
      <FadeIn delay={0.1}>
        <NewContractForm clientId={id} grantTypes={GRANT_TYPES} coverage={COVERAGE} />
      </FadeIn>
    </section>
  )
}

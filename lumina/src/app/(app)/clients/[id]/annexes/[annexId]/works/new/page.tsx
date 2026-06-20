import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { FadeIn } from '@/components/motion'
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

  return (
    <section className="mx-auto max-w-2xl space-y-8">
      <FadeIn>
        <header className="border-b border-border-elevation pb-6">
          <h1 className="font-display text-3xl font-semibold text-gold-metallic">إضافة عمل موسيقي</h1>
          <p className="mt-1 text-sm text-muted">أدخل عنوان العمل وبيانات أصحاب الحقوق.</p>
        </header>
      </FadeIn>
      <FadeIn delay={0.1}>
        <AddWorkForm clientId={id} annexId={annexId} />
      </FadeIn>
    </section>
  )
}

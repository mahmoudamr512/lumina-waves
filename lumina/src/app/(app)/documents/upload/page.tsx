import { FadeIn } from '@/components/motion'
import { UploadDocumentForm } from './UploadDocumentForm'

export const metadata = {
  title: 'رفع مستند | Lumina Waves',
}

export default function UploadDocumentPage() {
  return (
    <section className="mx-auto max-w-xl space-y-8">
      <FadeIn>
        <header className="space-y-1 border-b border-border-elevation pb-5">
          <h1 className="font-display text-3xl font-semibold text-gold-metallic">رفع مستند</h1>
          <p className="text-sm text-muted">ارفع ملفًا لبدء عملية التعرّف الضوئي على النص وفهرسته.</p>
        </header>
      </FadeIn>
      <FadeIn delay={0.1}>
        <UploadDocumentForm />
      </FadeIn>
    </section>
  )
}

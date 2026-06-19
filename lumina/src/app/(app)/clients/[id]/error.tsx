'use client'

import { useEffect } from 'react'

/**
 * Error boundary for the client detail route. Shows a friendly Arabic message
 * and a retry button. Logs the error to the console for diagnostics.
 */
export default function ClientDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Client detail route error:', error)
  }, [error])

  return (
    <section className="flex min-h-[50vh] flex-col items-center justify-center gap-5 text-center">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-foreground">تعذّر تحميل بيانات العميل</h1>
        <p className="max-w-sm text-sm text-muted">
          حدث خطأ غير متوقع أثناء جلب البيانات. يُرجى المحاولة مرة أخرى.
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-gold-400 px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-gold-300 focus:outline-none focus:ring-2 focus:ring-gold-200"
      >
        إعادة المحاولة
      </button>
    </section>
  )
}

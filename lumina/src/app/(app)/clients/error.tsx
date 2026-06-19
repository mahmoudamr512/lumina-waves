'use client'

import { useEffect } from 'react'

/**
 * Error boundary for the clients route. Shows a friendly Arabic message and a
 * retry button rather than a stack trace. Logs the error to the console for
 * diagnostics (server-side details are intentionally not surfaced to the user).
 */
export default function ClientsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Clients route error:', error)
  }, [error])

  return (
    <section className="flex min-h-[50vh] flex-col items-center justify-center gap-5 text-center">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-foreground">تعذّر تحميل العملاء</h1>
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

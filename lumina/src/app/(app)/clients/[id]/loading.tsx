/**
 * Skeleton shown while the client tree RSC resolves.
 */
export default function Loading() {
  return (
    <section className="space-y-8" aria-busy="true" aria-label="جارٍ تحميل بيانات العميل">
      <div className="space-y-3 border-b border-border-elevation pb-6">
        <div className="h-9 w-56 animate-pulse rounded-md bg-white/10 motion-reduce:animate-none" />
        <div className="h-5 w-40 animate-pulse rounded-md bg-white/5 motion-reduce:animate-none" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="h-48 animate-pulse rounded-2xl border border-border-elevation bg-surface/40 motion-reduce:animate-none"
          />
        ))}
      </div>
    </section>
  )
}

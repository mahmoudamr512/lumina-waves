/**
 * Skeleton shown while the clients RSC resolves. Mirrors the header + card grid
 * layout so the transition to real content is calm. `animate-pulse` is disabled
 * under reduced-motion.
 */
export default function Loading() {
  return (
    <section className="space-y-8" aria-busy="true" aria-label="جارٍ تحميل العملاء">
      <div className="flex items-end justify-between gap-4 border-b border-border-elevation pb-5">
        <div className="space-y-2">
          <div className="h-8 w-40 animate-pulse rounded-md bg-white/10 motion-reduce:animate-none" />
          <div className="h-4 w-28 animate-pulse rounded-md bg-white/5 motion-reduce:animate-none" />
        </div>
        <div className="h-10 w-28 animate-pulse rounded-lg bg-white/10 motion-reduce:animate-none" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-2xl border border-border-elevation bg-surface/40 motion-reduce:animate-none"
          />
        ))}
      </div>
    </section>
  )
}

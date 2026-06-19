/**
 * Skeleton shown while the works list RSC resolves.
 */
export default function Loading() {
  return (
    <section className="space-y-8" aria-busy="true" aria-label="جارٍ تحميل الأعمال">
      <div className="flex items-end justify-between gap-4 border-b border-border-elevation pb-5">
        <div className="space-y-2">
          <div className="h-8 w-32 animate-pulse rounded-md bg-white/10 motion-reduce:animate-none" />
          <div className="h-4 w-24 animate-pulse rounded-md bg-white/5 motion-reduce:animate-none" />
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border-elevation">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse border-b border-border-elevation bg-surface/40 motion-reduce:animate-none last:border-0"
          />
        ))}
      </div>
    </section>
  )
}

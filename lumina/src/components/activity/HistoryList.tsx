'use client'

import type { ActivityItem } from '@/services/activity'
import { EmptyState, IconOverview } from '@/components/ui'
import { timeAgoAr, formatDateAr } from '@/lib/labels'

function ActorAvatar({ actor }: { actor: ActivityItem['actor'] }) {
  return (
    <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-white/5 text-xs font-semibold text-muted">
      {actor.hasAvatar && actor.id ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/avatars/${actor.id}`} alt="" className="h-full w-full object-cover" />
      ) : (
        actor.name.trim().charAt(0) || '•'
      )}
    </span>
  )
}

function renderValue(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

export function HistoryList({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return <EmptyState icon={<IconOverview className="h-6 w-6" />} title="لا يوجد نشاط بعد" />
  }
  return (
    <ul className="space-y-4">
      {items.map((it) => (
        <li key={it.id} className="flex gap-3">
          <ActorAvatar actor={it.actor} />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-foreground/90">{it.phrase}</p>
            <p className="text-xs text-subtle" title={formatDateAr(it.createdAt, true)}>{timeAgoAr(it.createdAt)}</p>
            {it.diff && it.diff.length > 0 && (
              <details className="mt-1.5 text-xs">
                <summary className="cursor-pointer text-subtle hover:text-foreground focus-ring rounded">تفاصيل</summary>
                <table className="mt-2 w-full border-collapse text-xs">
                  <tbody>
                    {it.diff.map((d) => (
                      <tr key={d.field} className="border-t border-line">
                        <td className="py-1 pe-3 align-top font-medium text-muted">{d.field}</td>
                        <td className="py-1 pe-3 align-top text-danger/80" dir="auto">{renderValue(d.before)}</td>
                        <td className="py-1 align-top text-success/80" dir="auto">{renderValue(d.after)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

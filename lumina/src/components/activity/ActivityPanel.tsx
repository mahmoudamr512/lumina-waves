'use client'

import { useState } from 'react'
import type { ActivityItem } from '@/services/activity'
import { CommentThread, type CommentView } from './CommentThread'
import { HistoryList } from './HistoryList'
import { WatchToggle } from './WatchToggle'
import { cn } from '@/lib/cn'

type Tab = 'comments' | 'history'

/**
 * Shared entity activity panel: a Comments thread + a History timeline behind a
 * local tab switch. Server pages fetch the data and pass it in.
 */
export function ActivityPanel({
  entity,
  entityId,
  path,
  activity,
  comments,
  isAdmin,
  isWatching,
}: {
  entity: string
  entityId: string
  path: string
  activity: ActivityItem[]
  comments: CommentView[]
  isAdmin: boolean
  isWatching: boolean
}) {
  const [tab, setTab] = useState<Tab>('comments')

  const tabBtn = (key: Tab, label: string, count: number) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === key}
      onClick={() => setTab(key)}
      className={cn(
        '-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition focus-ring',
        tab === key ? 'border-gold-400 text-gold-200' : 'border-transparent text-muted hover:text-foreground',
      )}
    >
      {label} <span className="text-subtle">({count})</span>
    </button>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 border-b border-line">
        <div role="tablist" className="flex gap-1">
          {tabBtn('comments', 'التعليقات', comments.length)}
          {tabBtn('history', 'السجل', activity.length)}
        </div>
        <WatchToggle entity={entity} entityId={entityId} path={path} watching={isWatching} />
      </div>
      {tab === 'comments' ? (
        <CommentThread entity={entity} entityId={entityId} path={path} comments={comments} isAdmin={isAdmin} />
      ) : (
        <HistoryList items={activity} />
      )}
    </div>
  )
}

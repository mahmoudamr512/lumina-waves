import { loadSession } from '@/lib/session'
import { listEntityActivity, type ActivityItem } from '@/services/activity'
import { listComments, type CommentView } from '@/services/comments'

export interface EntityPanelData {
  activity: ActivityItem[]
  comments: CommentView[]
  isAdmin: boolean
}

/** Fetch everything an ActivityPanel needs for one entity (history + comments + role). */
export async function getEntityPanel(entity: string, entityId: string): Promise<EntityPanelData> {
  const s = await loadSession()
  const [activity, comments] = await Promise.all([
    listEntityActivity(entity, entityId),
    listComments(entity, entityId),
  ])
  return { activity, comments, isAdmin: s?.role === 'ADMIN' }
}

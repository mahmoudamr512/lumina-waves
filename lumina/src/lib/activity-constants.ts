/** Entities that support comment threads. (History timelines exist for all audited entities.) */
export const ACTIVITY_ENTITIES = ['Client', 'MasterContract', 'Work', 'Document'] as const

export type CommentableEntity = (typeof ACTIVITY_ENTITIES)[number]

export function isCommentableEntity(s: string): s is CommentableEntity {
  return (ACTIVITY_ENTITIES as readonly string[]).includes(s)
}

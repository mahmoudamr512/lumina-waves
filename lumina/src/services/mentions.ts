import { db } from '@/lib/db'
import { loadSession } from '@/lib/session'
import { AuthzError } from '@/lib/errors'
import { normalizeArabic } from '@/lib/arabic'

export interface MentionUser {
  id: string
  name: string
  hasAvatar: boolean
}

/** Type-ahead for @mentions: active users whose name matches (Arabic-normalized). */
export async function searchMentionUsers(q: string): Promise<MentionUser[]> {
  const s = await loadSession()
  if (!s) throw new AuthzError('UNAUTHENTICATED')
  const raw = (q ?? '').trim()
  if (raw.length < 1) return []
  // DB-side prefilter (scales past the JS take limit), then refine with
  // Arabic-normalized matching for diacritic/alef-insensitivity.
  const users = await db.user.findMany({
    where: { deletedAt: null, disabledAt: null, name: { contains: raw, mode: 'insensitive' } },
    select: { id: true, name: true, avatarPath: true },
    take: 20,
  })
  const query = normalizeArabic(raw)
  return users
    .filter((u) => normalizeArabic(u.name).includes(query))
    .slice(0, 8)
    .map((u) => ({ id: u.id, name: u.name, hasAvatar: Boolean(u.avatarPath) }))
}

/**
 * Keep only mention ids that (a) are real active users and (b) actually appear
 * as `@Name` in the comment body. (All roles can read commentable entities, so
 * no extra per-entity gate is needed; the entity arg is kept for future use.)
 */
export async function resolveMentions(_entity: string, mentionIds: string[], body: string): Promise<string[]> {
  const ids = [...new Set(mentionIds)].filter(Boolean)
  if (ids.length === 0) return []
  const users = await db.user.findMany({
    where: { id: { in: ids }, deletedAt: null, disabledAt: null },
    select: { id: true, name: true },
  })
  return users.filter((u) => body.includes(`@${u.name}`)).map((u) => u.id)
}

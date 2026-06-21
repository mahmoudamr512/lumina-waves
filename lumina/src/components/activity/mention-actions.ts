'use server'

import { searchMentionUsers } from '@/services/mentions'

export async function searchMentions(q: string) {
  return searchMentionUsers(q)
}

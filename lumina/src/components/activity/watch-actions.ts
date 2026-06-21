'use server'

import { revalidatePath } from 'next/cache'
import { watch, unwatch } from '@/services/watchers'

export async function watchAction(entity: string, entityId: string, path: string) {
  await watch(entity, entityId)
  if (path) revalidatePath(path)
  return { ok: true }
}

export async function unwatchAction(entity: string, entityId: string, path: string) {
  await unwatch(entity, entityId)
  if (path) revalidatePath(path)
  return { ok: true }
}

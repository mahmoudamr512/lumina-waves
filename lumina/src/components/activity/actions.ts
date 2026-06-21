'use server'

import { revalidatePath } from 'next/cache'
import { addComment, editComment, deleteComment } from '@/services/comments'
import { userErrorMessage } from '@/lib/user-errors'

export interface CommentActionState {
  error: string | null
  ok?: boolean
}

/** Post a new comment (useActionState form). */
export async function postComment(_prev: CommentActionState, fd: FormData): Promise<CommentActionState> {
  const entity = String(fd.get('entity') ?? '')
  const entityId = String(fd.get('entityId') ?? '')
  const path = String(fd.get('path') ?? '')
  const body = String(fd.get('body') ?? '')
  const mentionIds = String(fd.get('mentionIds') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (!body.trim()) return { error: 'لا يمكن إرسال تعليق فارغ.' }
  try {
    await addComment(entity, entityId, body, mentionIds)
  } catch (e) {
    return { error: userErrorMessage(e) }
  }
  if (path) revalidatePath(path)
  return { error: null, ok: true }
}

/** Edit own comment (direct form action; the UI only exposes this on your own comments). */
export async function editCommentDirect(fd: FormData): Promise<void> {
  const id = String(fd.get('id') ?? '')
  const body = String(fd.get('body') ?? '')
  const path = String(fd.get('path') ?? '')
  await editComment(id, body)
  if (path) revalidatePath(path)
}

/** Delete own comment (or any comment, for ADMIN). */
export async function deleteCommentDirect(fd: FormData): Promise<void> {
  const id = String(fd.get('id') ?? '')
  const path = String(fd.get('path') ?? '')
  await deleteComment(id)
  if (path) revalidatePath(path)
}

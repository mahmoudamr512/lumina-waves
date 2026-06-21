'use server'

import { revalidatePath } from 'next/cache'
import { updateMyProfile, changeMyPassword, setMyAvatar, removeMyAvatar } from '@/services/account'
import { revokeMySession, revokeMyOtherSessions } from '@/services/sessions'
import { userErrorMessage } from '@/lib/user-errors'

export interface ActionState {
  error: string | null
  ok?: boolean
}

export async function saveMyProfile(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const name = String(fd.get('name') ?? '').trim()
  const email = String(fd.get('email') ?? '').trim()
  const phone = String(fd.get('phone') ?? '').trim()
  if (!name) return { error: 'الاسم مطلوب.' }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'بريد إلكتروني غير صالح.' }
  try {
    await updateMyProfile({ name, email, phone: phone || null })
  } catch (e) {
    return { error: userErrorMessage(e) }
  }
  revalidatePath('/account')
  return { error: null, ok: true }
}

export async function changePassword(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const current = String(fd.get('current') ?? '')
  const next = String(fd.get('next') ?? '')
  const confirm = String(fd.get('confirm') ?? '')
  if (next.length < 8) return { error: 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.' }
  if (next !== confirm) return { error: 'كلمتا المرور غير متطابقتين.' }
  try {
    await changeMyPassword(current, next)
  } catch (e) {
    return { error: userErrorMessage(e) }
  }
  revalidatePath('/account')
  return { error: null, ok: true }
}

export async function setMyAvatarAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const file = fd.get('avatar')
  if (!(file instanceof File) || file.size === 0) return { error: 'اختر صورة.' }
  try {
    await setMyAvatar(file)
  } catch (e) {
    return { error: userErrorMessage(e) }
  }
  revalidatePath('/account')
  return { error: null, ok: true }
}

export async function removeMyAvatarAction(_prev: ActionState): Promise<ActionState> {
  try {
    await removeMyAvatar()
  } catch (e) {
    return { error: userErrorMessage(e) }
  }
  revalidatePath('/account')
  return { error: null, ok: true }
}

export async function revokeMyOtherSessionsAction(_prev: ActionState): Promise<ActionState> {
  try {
    await revokeMyOtherSessions()
  } catch (e) {
    return { error: userErrorMessage(e) }
  }
  revalidatePath('/account')
  return { error: null, ok: true }
}

export async function revokeMySessionAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const sessionId = String(fd.get('sessionId') ?? '')
  try {
    await revokeMySession(sessionId)
  } catch (e) {
    return { error: userErrorMessage(e) }
  }
  revalidatePath('/account')
  return { error: null, ok: true }
}

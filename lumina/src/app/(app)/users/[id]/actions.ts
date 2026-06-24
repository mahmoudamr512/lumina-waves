'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  updateUser,
  changeRole,
  setUserPassword,
  disableUser,
  enableUser,
  deleteUser,
  hardDeleteUser,
  setUserAvatar,
  removeUserAvatar,
} from '@/services/users'
import { revokeSession, revokeAllUserSessions } from '@/services/sessions'
import { userErrorMessage } from '@/lib/user-errors'
import type { Role } from '@/generated/prisma/client'

export interface ActionState {
  error: string | null
  ok?: boolean
}

const ROLES: Role[] = ['ADMIN', 'OPERATIONS', 'LEGAL', 'FINANCE', 'VIEWER']

export async function saveUser(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get('id') ?? '')
  const name = String(fd.get('name') ?? '').trim()
  const email = String(fd.get('email') ?? '').trim()
  const phone = String(fd.get('phone') ?? '').trim()
  const role = String(fd.get('role') ?? '') as Role
  if (!name) return { error: 'الاسم مطلوب.' }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'بريد إلكتروني غير صالح.' }
  if (!ROLES.includes(role)) return { error: 'اختر دورًا صالحًا.' }
  try {
    await updateUser(id, { name, email, phone: phone || null })
    await changeRole(id, role)
  } catch (e) {
    return { error: userErrorMessage(e) }
  }
  revalidatePath(`/users/${id}`)
  return { error: null, ok: true }
}

export async function resetPassword(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get('id') ?? '')
  const password = String(fd.get('password') ?? '')
  if (password.length < 8) return { error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.' }
  try {
    await setUserPassword(id, password)
  } catch (e) {
    return { error: userErrorMessage(e) }
  }
  revalidatePath(`/users/${id}`)
  return { error: null, ok: true }
}

export async function toggleDisabled(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get('id') ?? '')
  const disable = String(fd.get('disable') ?? '') === 'true'
  try {
    if (disable) await disableUser(id)
    else await enableUser(id)
  } catch (e) {
    return { error: userErrorMessage(e) }
  }
  revalidatePath(`/users/${id}`)
  return { error: null, ok: true }
}

export async function removeUser(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get('id') ?? '')
  try {
    await deleteUser(id)
  } catch (e) {
    return { error: userErrorMessage(e) }
  }
  revalidatePath('/users')
  redirect('/users')
}

/** Permanent delete (no 3-day recovery). Admin-only via the underlying service. */
export async function hardRemoveUser(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get('id') ?? '')
  try {
    await hardDeleteUser(id)
  } catch (e) {
    return { error: userErrorMessage(e) }
  }
  revalidatePath('/users')
  redirect('/users')
}

export async function setAvatar(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get('id') ?? '')
  const file = fd.get('avatar')
  if (!(file instanceof File) || file.size === 0) return { error: 'اختر صورة.' }
  try {
    await setUserAvatar(id, file)
  } catch (e) {
    return { error: userErrorMessage(e) }
  }
  revalidatePath(`/users/${id}`)
  return { error: null, ok: true }
}

export async function clearAvatar(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get('id') ?? '')
  try {
    await removeUserAvatar(id)
  } catch (e) {
    return { error: userErrorMessage(e) }
  }
  revalidatePath(`/users/${id}`)
  return { error: null, ok: true }
}

export async function revokeOneSession(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get('id') ?? '')
  const sessionId = String(fd.get('sessionId') ?? '')
  try {
    await revokeSession(sessionId)
  } catch (e) {
    return { error: userErrorMessage(e) }
  }
  revalidatePath(`/users/${id}`)
  return { error: null, ok: true }
}

export async function revokeAllSessions(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get('id') ?? '')
  try {
    await revokeAllUserSessions(id)
  } catch (e) {
    return { error: userErrorMessage(e) }
  }
  revalidatePath(`/users/${id}`)
  return { error: null, ok: true }
}

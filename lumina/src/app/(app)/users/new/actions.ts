'use server'

import { revalidatePath } from 'next/cache'
import { createUser } from '@/services/users'
import { userErrorMessage } from '@/lib/user-errors'
import type { Role } from '@/generated/prisma/client'

const ROLES: Role[] = ['ADMIN', 'OPERATIONS', 'LEGAL', 'FINANCE', 'VIEWER']

export interface AddUserState {
  error: string | null
  ok?: boolean
  values?: { email: string; name: string; role: string }
}

export async function addUser(_prev: AddUserState, formData: FormData): Promise<AddUserState> {
  const email = String(formData.get('email') ?? '').trim()
  const name = String(formData.get('name') ?? '').trim()
  const role = String(formData.get('role') ?? '') as Role
  const password = String(formData.get('password') ?? '')
  const values = { email, name, role }

  if (!name) return { error: 'الاسم مطلوب.', values }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'بريد إلكتروني غير صالح.', values }
  if (!ROLES.includes(role)) return { error: 'اختر دورًا صالحًا.', values }
  if (password.length < 8) return { error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.', values }

  try {
    await createUser({ email, name, role, password })
  } catch (e) {
    return { error: userErrorMessage(e), values }
  }
  revalidatePath('/users')
  return { error: null, ok: true }
}

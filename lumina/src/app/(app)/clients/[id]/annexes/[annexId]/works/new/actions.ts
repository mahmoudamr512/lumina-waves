'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createWork } from '@/services/works'
import { AuthzError } from '@/lib/errors'

export interface AddWorkState {
  error: string | null
}

export async function addWork(
  _prev: AddWorkState,
  formData: FormData,
): Promise<AddWorkState> {
  const annexId = String(formData.get('annexId') ?? '').trim()
  const clientId = String(formData.get('clientId') ?? '').trim()
  const title = String(formData.get('title') ?? '').trim()

  if (!title) return { error: 'عنوان العمل مطلوب.' }

  const VALID_ROLES = ['AUTHOR', 'COMPOSER', 'ARRANGER', 'PERFORMER', 'PRODUCER'] as const
  type CreditRole = (typeof VALID_ROLES)[number]

  // Collect optional credit rows: role_0/name_0 … role_3/name_3
  const credits: { role: CreditRole; name: string }[] = []
  for (let i = 0; i < 4; i++) {
    const role = String(formData.get(`role_${i}`) ?? '').trim()
    const name = String(formData.get(`name_${i}`) ?? '').trim()
    if (role && name && (VALID_ROLES as readonly string[]).includes(role)) {
      credits.push({ role: role as CreditRole, name })
    }
  }

  try {
    await createWork({ title, annexId: annexId || undefined, credits })
  } catch (err) {
    if (err instanceof AuthzError) return { error: 'ليس لديك صلاحية لإضافة عمل.' }
    return { error: 'تعذّر حفظ العمل. يُرجى المحاولة مرة أخرى.' }
  }

  revalidatePath('/clients/' + clientId)
  redirect('/clients/' + clientId)
}

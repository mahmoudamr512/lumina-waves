'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { uploadDocument } from '@/services/documents'
import { AuthzError } from '@/lib/errors'

export interface UploadDocumentState {
  error: string | null
}

export async function uploadDocumentAction(
  _prev: UploadDocumentState,
  formData: FormData,
): Promise<UploadDocumentState> {
  const file = formData.get('file') as File | null
  const contractId = String(formData.get('contractId') ?? '').trim() || undefined
  const annexId = String(formData.get('annexId') ?? '').trim() || undefined

  if (!file || file.size === 0) {
    return { error: 'يرجى اختيار ملف للرفع.' }
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    await uploadDocument({ buffer, filename: file.name, contractId, annexId })
  } catch (err) {
    if (err instanceof AuthzError) {
      return { error: 'ليس لديك صلاحية لرفع المستندات.' }
    }
    return { error: 'تعذّر رفع المستند. يُرجى المحاولة مرة أخرى.' }
  }

  revalidatePath('/documents')
  redirect('/documents')
}

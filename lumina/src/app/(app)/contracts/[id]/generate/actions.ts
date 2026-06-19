'use server'

import { revalidatePath } from 'next/cache'
import { generateContractPdf } from '@/services/documents'
import { AuthzError } from '@/lib/errors'

export interface GenerateContractState {
  error: string | null
  docId?: string
}

/**
 * Server Action: generate a Draft PDF for the given contract.
 * Returns the new Document id on success so the page can show a download link.
 * On failure, returns a friendly Arabic message — never a raw stack trace.
 */
export async function generateContract(
  contractId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prev: GenerateContractState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData,
): Promise<GenerateContractState> {
  try {
    const doc = await generateContractPdf(contractId)
    revalidatePath(`/contracts/${contractId}/generate`)
    return { error: null, docId: doc.id }
  } catch (err) {
    if (err instanceof AuthzError) {
      return { error: 'ليس لديك صلاحية لإنشاء مستند العقد. هذا الإجراء متاح للمستخدمين من فئة المدير والقانونيين فقط.' }
    }
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'contract not found') {
      return { error: 'لم يُعثر على العقد المطلوب.' }
    }
    return { error: 'تعذّر إنشاء المستند. يُرجى المحاولة مرة أخرى.' }
  }
}

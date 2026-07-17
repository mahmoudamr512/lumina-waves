'use server'

import { revalidatePath } from 'next/cache'
import {
  generateContractPdf,
  generateContractTafweedPdf,
  generateContractAndTafweedPdf,
} from '@/services/documents'
import { AuthzError } from '@/lib/errors'

export interface GenerateContractState {
  error: string | null
  docId?: string
}

/**
 * Server Action: generate a Draft PDF for the given contract.
 * `variant` picks between the contract only, the SALE tafweed only, or the
 * combined SALE contract + tafweed (SALE contracts only for the last two).
 */
export async function generateContract(
  contractId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prev: GenerateContractState,
  formData: FormData,
): Promise<GenerateContractState> {
  // Unchecked HTML checkboxes are OMITTED from FormData — presence = checked.
  const withSeal = formData.get('withSeal') === 'true'
  const variant = String(formData.get('variant') ?? 'contract').trim() as 'contract' | 'tafweed' | 'combined'
  try {
    let doc
    if (variant === 'tafweed') {
      doc = await generateContractTafweedPdf(contractId, { withSeal })
    } else if (variant === 'combined') {
      doc = await generateContractAndTafweedPdf(contractId, { withSeal })
    } else {
      doc = await generateContractPdf(contractId, { withSeal })
    }
    revalidatePath(`/contracts/${contractId}/generate`)
    return { error: null, docId: doc.id }
  } catch (err) {
    console.error('[generateContract] failed:', err)
    if (err instanceof AuthzError) {
      return { error: 'ليس لديك صلاحية لإنشاء مستند العقد. هذا الإجراء متاح للمستخدمين من فئة المدير والقانونيين فقط.' }
    }
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'contract not found') return { error: 'لم يُعثر على العقد المطلوب.' }
    if (msg.includes('SALE')) return { error: 'التقرير والتفويض متاح فقط لعقود البيع.' }
    return { error: 'تعذّر إنشاء المستند. يُرجى المحاولة مرة أخرى.' }
  }
}

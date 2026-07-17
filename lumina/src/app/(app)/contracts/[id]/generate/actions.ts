'use server'

import { revalidatePath } from 'next/cache'
import { generateContractPdf, generateContractTafweedPdf } from '@/services/documents'
import { AuthzError } from '@/lib/errors'

export interface GenerateContractState {
  error: string | null
  docId?: string
}

/**
 * Server Action: generate a Draft PDF for the given contract.
 * `variant` picks between the contract only and (for SALE contracts) the
 * standalone ekrar. Contract and ekrar are always separate PDFs — no combined
 * variant, per user preference: each document has one clear purpose + filename.
 */
export async function generateContract(
  contractId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prev: GenerateContractState,
  formData: FormData,
): Promise<GenerateContractState> {
  // Unchecked HTML checkboxes are OMITTED from FormData — presence = checked.
  const withSeal = formData.get('withSeal') === 'true'
  // The SALE flow deliberately keeps the contract and the ekrar as SEPARATE
  // PDFs — no "combined" variant. If the user wants both, they generate each
  // one individually. This avoids confusing filenames + doubled letterheads.
  const variant = String(formData.get('variant') ?? 'contract').trim() as 'contract' | 'tafweed'
  try {
    const doc =
      variant === 'tafweed'
        ? await generateContractTafweedPdf(contractId, { withSeal })
        : await generateContractPdf(contractId, { withSeal })
    revalidatePath(`/contracts/${contractId}/generate`)
    return { error: null, docId: doc.id }
  } catch (err) {
    console.error('[generateContract] failed:', err)
    if (err instanceof AuthzError) {
      return { error: 'ليس لديك صلاحية لإنشاء مستند العقد. هذا الإجراء متاح للمستخدمين من فئة المدير والقانونيين فقط.' }
    }
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'contract not found') return { error: 'لم يُعثر على العقد المطلوب.' }
    if (msg.includes('SALE')) return { error: 'الإقرار متاح فقط لعقود البيع.' }
    return { error: 'تعذّر إنشاء المستند. يُرجى المحاولة مرة أخرى.' }
  }
}

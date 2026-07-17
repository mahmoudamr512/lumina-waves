'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'node:crypto'
import { generateContractPdf, generateContractTafweedPdf } from '@/services/documents'
import { AuthzError } from '@/lib/errors'
import { db } from '@/lib/db'

export interface GenerateContractState {
  error: string | null
  /** ID of the primary document (contract). Kept for legacy single-doc callers. */
  docId?: string
  /** Contract-draft document id — set on every successful generation. */
  contractDocId?: string
  /** Ekrar document id — set on successful SALE generations. */
  ekrarDocId?: string
  /** Shared bundle id linking the contract + ekrar (SALE) so signed uploads
   * can rejoin the same bundle later. */
  bundleId?: string
}

/**
 * Server Action: generate contract PDFs.
 *
 * SALE contracts: ALWAYS generate BOTH the contract draft AND the standalone
 * ekrar in one click, tagged with the same `bundleId` so the UI can group
 * them ("this ekrar goes with that contract") and the eventual signed uploads
 * can inherit the same bundle. The two files stay SEPARATE PDFs — same
 * download page shows both links.
 *
 * DISTRIBUTION contracts: just the contract draft. Annex-level tafweeds are
 * generated from the annex UI, not this page.
 */
export async function generateContract(
  contractId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prev: GenerateContractState,
  formData: FormData,
): Promise<GenerateContractState> {
  // Unchecked HTML checkboxes are OMITTED from FormData — presence = checked.
  const withSeal = formData.get('withSeal') === 'true'
  try {
    const contract = await db.masterContract.findUnique({
      where: { id: contractId },
      select: { grantType: true },
    })
    if (!contract) return { error: 'لم يُعثر على العقد المطلوب.' }

    // Fresh bundle id per generation — all PDFs produced by this click share it.
    const bundleId = randomUUID()
    const contractDoc = await generateContractPdf(contractId, { withSeal, bundleId })
    let ekrarDoc: { id: string } | null = null
    if (contract.grantType === 'SALE') {
      ekrarDoc = await generateContractTafweedPdf(contractId, { withSeal, bundleId })
    }

    revalidatePath(`/contracts/${contractId}/generate`)
    return {
      error: null,
      docId: contractDoc.id,
      contractDocId: contractDoc.id,
      ekrarDocId: ekrarDoc?.id,
      bundleId,
    }
  } catch (err) {
    console.error('[generateContract] failed:', err)
    if (err instanceof AuthzError) {
      return { error: 'ليس لديك صلاحية لإنشاء مستند العقد. هذا الإجراء متاح للمستخدمين من فئة المدير والقانونيين فقط.' }
    }
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'contract not found') return { error: 'لم يُعثر على العقد المطلوب.' }
    return { error: 'تعذّر إنشاء المستند. يُرجى المحاولة مرة أخرى.' }
  }
}

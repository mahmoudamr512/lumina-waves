'use server'

import { revalidatePath } from 'next/cache'
import { createContract } from '@/services/contracts'
import { AuthzError } from '@/lib/errors'

export interface AddContractState {
  error: string | null
  /** Set on success — the form toasts and navigates to the new contract. */
  ok?: boolean
  contractId?: string
}

export async function addContract(
  _prev: AddContractState,
  formData: FormData,
): Promise<AddContractState> {
  const clientId = String(formData.get('clientId') ?? '').trim()
  const grantType = String(formData.get('grantType') ?? '').trim() as
    | 'FULL_ASSIGNMENT'
    | 'EXCLUSIVE_LICENSE'
    | 'NON_EXCLUSIVE_LICENSE'
    | 'MANAGEMENT'
  const territory = String(formData.get('territory') ?? '').trim()
  const termMonths = parseInt(String(formData.get('termMonths') ?? '36'), 10)
  const revenueSharePct = parseFloat(String(formData.get('revenueSharePct') ?? '70'))
  const settlementFreq = String(formData.get('settlementFreq') ?? '').trim()
  const noticeDays = parseInt(String(formData.get('noticeDays') ?? '90'), 10)
  // Buyout / consideration amount in EGP (used by sale & assignment contracts);
  // stored in minPayoutCents (×100). Optional.
  const amountEgpRaw = String(formData.get('amountEgp') ?? '').trim()
  const amountEgp = amountEgpRaw ? parseFloat(amountEgpRaw) : NaN
  const signedDateRaw = String(formData.get('signedDate') ?? '').trim()
  const coverage = formData.getAll('coverage').map(String)

  if (!coverage.length) {
    return { error: 'يجب اختيار صورة استغلال واحدة على الأقل (المادة 149 من قانون حقوق المؤلف).' }
  }

  if (!grantType || !territory) {
    return { error: 'يرجى تعبئة جميع الحقول المطلوبة.' }
  }

  const revenueShareBps = Math.round(revenueSharePct * 100)
  const signedDate = signedDateRaw ? new Date(signedDateRaw) : undefined

  let contractId: string
  try {
    const created = await createContract({
      clientId,
      grantType,
      territory,
      termMonths: isNaN(termMonths) ? 36 : termMonths,
      coverage,
      revenueShareBps: isNaN(revenueShareBps) ? undefined : revenueShareBps,
      minPayoutCents: isNaN(amountEgp) ? undefined : Math.round(amountEgp * 100),
      settlementFreq: settlementFreq || undefined,
      noticeDays: isNaN(noticeDays) ? undefined : noticeDays,
      signedDate,
    })
    contractId = String(created.id)
  } catch (err) {
    if (err instanceof AuthzError) {
      return { error: 'ليس لديك صلاحية لإنشاء عقد.' }
    }
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('coverage')) {
      return { error: 'يجب اختيار صورة استغلال واحدة على الأقل (المادة 149).' }
    }
    if (msg.includes('invalid territory')) {
      return { error: 'النطاق الجغرافي غير صالح.' }
    }
    if (msg.includes('invalid grant type')) {
      return { error: 'نوع المنح غير صالح.' }
    }
    return { error: 'تعذّر حفظ العقد. يُرجى المحاولة مرة أخرى.' }
  }

  revalidatePath('/clients/' + clientId)
  return { error: null, ok: true, contractId }
}

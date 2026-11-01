'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { softDeleteContract, hardDeleteContract } from '@/services/contracts'
import { softDeleteAnnex, hardDeleteAnnex } from '@/services/annexes'
import { AuthzError } from '@/lib/errors'

export interface DeleteState {
  error: string | null
  ok?: boolean
}

/** Move the contract to trash (3-day recovery window). */
export async function removeContract(_prev: DeleteState, fd: FormData): Promise<DeleteState> {
  const id = String(fd.get('id') ?? '')
  try {
    await softDeleteContract(id)
  } catch (err) {
    if (err instanceof AuthzError) return { error: 'ليس لديك صلاحية لحذف العقد.' }
    return { error: 'تعذّر حذف العقد. يُرجى المحاولة مرة أخرى.' }
  }
  revalidatePath('/contracts')
  redirect('/contracts')
}

/** Permanent delete — no 3-day recovery window. Admin-only via the service. */
export async function hardRemoveContract(_prev: DeleteState, fd: FormData): Promise<DeleteState> {
  const id = String(fd.get('id') ?? '')
  try {
    await hardDeleteContract(id)
  } catch (err) {
    if (err instanceof AuthzError) return { error: 'ليس لديك صلاحية لحذف العقد.' }
    return { error: 'تعذّر حذف العقد. يُرجى المحاولة مرة أخرى.' }
  }
  revalidatePath('/contracts')
  redirect('/contracts')
}

async function deleteAnnex(fd: FormData, del: (id: string) => Promise<{ contractId: string }>): Promise<DeleteState> {
  const id = String(fd.get('id') ?? '')
  try {
    const { contractId } = await del(id)
    revalidatePath(`/contracts/${contractId}`)
  } catch (err) {
    if (err instanceof AuthzError) return { error: 'ليس لديك صلاحية لحذف الملحق.' }
    return { error: 'تعذّر حذف الملحق. يُرجى المحاولة مرة أخرى.' }
  }
  return { error: null, ok: true }
}

/** Move the annex (with its works/documents) to trash; the contract stays. */
export async function removeAnnex(_prev: DeleteState, fd: FormData): Promise<DeleteState> {
  return deleteAnnex(fd, softDeleteAnnex)
}

/** Permanent annex delete — no 3-day recovery window. Admin-only via the service. */
export async function hardRemoveAnnex(_prev: DeleteState, fd: FormData): Promise<DeleteState> {
  return deleteAnnex(fd, hardDeleteAnnex)
}

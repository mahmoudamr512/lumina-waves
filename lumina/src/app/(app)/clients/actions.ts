'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/services/clients'
import { AuthzError } from '@/lib/errors'

export interface AddClientState {
  error: string | null
  /** True once the client was created — the form toasts and navigates on this. */
  ok?: boolean
  /** Preserved field values so the form can re-render without losing input. */
  values?: { legalName: string; stageName: string; nationalId: string }
}

/**
 * Server Action backing the "new client" form. Validates lightly client-side
 * for UX; the authoritative checks are the service's RBAC (`requireUser`) and
 * the 14-digit nationalId rule inside `createClient`. Server-side failures are
 * returned as a friendly Arabic message via `useActionState` rather than
 * thrown — so a bad nationalId never produces an unhandled exception page.
 *
 * On success we revalidate /clients and return `ok: true`; the client form
 * shows a toast and navigates (so the success confirmation is visible).
 */
export async function addClient(
  _prev: AddClientState,
  formData: FormData,
): Promise<AddClientState> {
  const legalName = String(formData.get('legalName') ?? '').trim()
  const stageNameRaw = String(formData.get('stageName') ?? '').trim()
  const nationalId = String(formData.get('nationalId') ?? '').trim()
  const values = { legalName, stageName: stageNameRaw, nationalId }

  if (!legalName) {
    return { error: 'الاسم القانوني مطلوب.', values }
  }
  if (!/^\d{14}$/.test(nationalId)) {
    return { error: 'الرقم القومي يجب أن يتكوّن من 14 رقمًا.', values }
  }

  try {
    await createClient({
      legalName,
      stageName: stageNameRaw || undefined,
      nationalId,
    })
  } catch (err) {
    if (err instanceof AuthzError) {
      return { error: 'ليس لديك صلاحية لإضافة عميل.', values }
    }
    // Unique-constraint (duplicate nationalId) and other known issues.
    const message = err instanceof Error ? err.message : ''
    if (message.includes('nationalId') && message.includes('14')) {
      return { error: 'الرقم القومي يجب أن يتكوّن من 14 رقمًا.', values }
    }
    if (
      message.includes('Unique constraint') ||
      message.toLowerCase().includes('unique') ||
      message.includes('P2002')
    ) {
      return { error: 'يوجد عميل آخر بنفس الرقم القومي.', values }
    }
    return { error: 'تعذّر حفظ العميل. يُرجى المحاولة مرة أخرى.', values }
  }

  revalidatePath('/clients')
  return { error: null, ok: true }
}

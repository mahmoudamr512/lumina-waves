'use server'

import { revalidatePath } from 'next/cache'
import { createContract } from '@/services/contracts'
import { createAnnex } from '@/services/annexes'
import { createWork } from '@/services/works'
import { parseWorksSpreadsheet } from '@/lib/works-import'
import { AuthzError } from '@/lib/errors'
import type { CoverageMode } from '@/lib/rights'

export interface AddContractState {
  error: string | null
  /** Set on success — the form toasts and navigates to the new contract. */
  ok?: boolean
  contractId?: string
  /** Number of works auto-imported from the uploaded Excel/CSV (SALE only). */
  importedWorks?: number
}

export async function addContract(
  _prev: AddContractState,
  formData: FormData,
): Promise<AddContractState> {
  const clientId = String(formData.get('clientId') ?? '').trim()
  const grantType = String(formData.get('grantType') ?? '').trim() as 'SALE' | 'DISTRIBUTION'
  const territory = String(formData.get('territory') ?? '').trim()
  const coverageMode = String(formData.get('coverageMode') ?? '').trim() as CoverageMode
  const coverageExclusions = String(formData.get('coverageExclusions') ?? '')
    .split(/[,،]/)
    .map((s) => s.trim())
    .filter(Boolean)
  // SALE = perpetual buyout, no contract length. Only parse termMonths for DISTRIBUTION.
  const termMonthsRaw = formData.get('termMonths')
  const termMonths =
    grantType === 'SALE' || termMonthsRaw == null ? undefined : parseInt(String(termMonthsRaw), 10)
  const revenueSharePct = parseFloat(String(formData.get('revenueSharePct') ?? '70'))
  const settlementFreq = String(formData.get('settlementFreq') ?? '').trim()
  const noticeDays = parseInt(String(formData.get('noticeDays') ?? '90'), 10)
  // Buyout / consideration amount in EGP (used by sale & assignment contracts);
  // stored in minPayoutCents (×100). Optional.
  const amountEgpRaw = String(formData.get('amountEgp') ?? '').trim()
  const amountEgp = amountEgpRaw ? parseFloat(amountEgpRaw) : NaN
  const signedDateRaw = String(formData.get('signedDate') ?? '').trim()
  const party1Address = String(formData.get('party1Address') ?? '').trim()

  if (!grantType || !territory) {
    return { error: 'يرجى تعبئة جميع الحقول المطلوبة.' }
  }
  if (!coverageMode) {
    return { error: 'يرجى اختيار نطاق التغطية.' }
  }

  const revenueShareBps = Math.round(revenueSharePct * 100)
  const signedDate = signedDateRaw ? new Date(signedDateRaw) : undefined

  let contractId: string
  try {
    const created = await createContract({
      clientId,
      grantType,
      territory,
      termMonths: termMonths === undefined ? undefined : isNaN(termMonths) ? 36 : termMonths,
      coverageMode,
      coverageExclusions,
      // Revenue-share / settlement / notice-days are licensing fields that only
      // apply to DISTRIBUTION. A SALE (بيع وتنازل) is a perpetual buyout with a
      // single lump-sum amount, so we EXPLICITLY skip these and let them be
      // null on the row (otherwise the form's hidden defaults would leak in).
      revenueShareBps: grantType === 'SALE' ? undefined : (isNaN(revenueShareBps) ? undefined : revenueShareBps),
      minPayoutCents: isNaN(amountEgp) ? undefined : Math.round(amountEgp * 100),
      settlementFreq: grantType === 'SALE' ? undefined : (settlementFreq || undefined),
      noticeDays: grantType === 'SALE' ? undefined : (isNaN(noticeDays) ? undefined : noticeDays),
      signedDate,
    })
    contractId = String(created.id)
    // Best-effort: persist the party-1 address on the underlying client so it
    // flows into every future PDF and stays visible on the client detail page.
    if (party1Address) {
      try {
        const { db } = await import('@/lib/db')
        await db.client.update({ where: { id: clientId }, data: { address: party1Address } })
      } catch (err) {
        console.warn('[addContract] address save failed (best-effort):', err)
      }
    }
  } catch (err) {
    if (err instanceof AuthzError) {
      return { error: 'ليس لديك صلاحية لإنشاء عقد.' }
    }
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('coverage mode')) {
      return { error: 'نطاق التغطية غير صالح.' }
    }
    if (msg.includes('invalid territory')) {
      return { error: 'النطاق الجغرافي غير صالح.' }
    }
    if (msg.includes('invalid grant type')) {
      return { error: 'نوع المنح غير صالح.' }
    }
    return { error: 'تعذّر حفظ العقد. يُرجى المحاولة مرة أخرى.' }
  }

  // Excel/CSV works list (SALE only) — auto-create an annex + Work rows so
  // Article 3's consideration table renders them in the generated PDF.
  let importedWorks = 0
  if (grantType === 'SALE') {
    const file = formData.get('worksFile')
    if (file instanceof File && file.size > 0) {
      try {
        const buf = Buffer.from(await file.arrayBuffer())
        const { headers, rows, raw } = parseWorksSpreadsheet(buf)
        if (rows.length > 0 || raw.length > 0) {
          const annex = await createAnnex({ contractId, annexDate: signedDate ?? new Date() })
          // Persist headers + the raw Excel grid on both the contract (for
          // SALE Art.3 dynamic table) and the annex (for its own PDFs).
          const { db } = await import('@/lib/db')
          const table = headers.length || raw.length ? { headers, rows: raw } : undefined
          await db.masterContract.update({
            where: { id: contractId },
            data: { worksHeaders: headers, worksTable: table },
          })
          await db.annex.update({
            where: { id: annex.id },
            data: { worksHeaders: headers, worksTable: table },
          })
          for (const r of rows) {
            await createWork({
              title: r.title,
              rightsAxis: 'BOTH',
              annexId: annex.id,
              credits: r.performer ? [{ role: 'PERFORMER', name: r.performer }] : [],
            })
          }
          importedWorks = rows.length
        }
      } catch (err) {
        // Best-effort import — a bad file must NOT block contract creation.
        console.warn('[addContract] works Excel import failed (best-effort):', err)
      }
    }
  }

  revalidatePath('/clients/' + clientId)
  return { error: null, ok: true, contractId, importedWorks }
}

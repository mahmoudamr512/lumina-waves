import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { AuthzError } from '@/lib/errors'
import { writeAudit } from '@/lib/audit'
import { renderContract } from '@/templates/contracts'
import { renderPdf } from '@/lib/pdf'
import { queues } from '@/lib/queue'

const STORAGE = process.env.STORAGE_DIR ?? './.storage'

// Roles permitted to generate documents that embed sensitive data (National ID).
// FINANCE can *read* sensitive fields but must not generate outbound PDF artefacts
// that embed them — that is an ADMIN/LEGAL function. OPERATIONS and VIEWER are
// entirely excluded. Fail-closed: any role not in this list is rejected.
const SENSITIVE_DOC_ROLES: string[] = ['ADMIN', 'LEGAL']

export async function generateContractPdf(contractId: string) {
  // Gate 1: caller must have `create` permission on Document (standard RBAC).
  const u = await requireUser('create', 'Document')

  // Gate 2: the generated PDF embeds the client's National ID (sensitive PII).
  // Only ADMIN and LEGAL are permitted to produce such artefacts. FINANCE is
  // read-only; OPERATIONS and VIEWER have no business receiving raw National IDs
  // in outbound files. Throw the same AuthzError the rest of the system uses so
  // the caller can handle it uniformly.
  if (!SENSITIVE_DOC_ROLES.includes(u.role)) {
    throw new AuthzError('FORBIDDEN')
  }

  const k = await db.masterContract.findUnique({
    where: { id: contractId },
    include: {
      client: true,
      // The soft-delete extension does NOT filter nested includes, so filter
      // deletedAt manually — otherwise soft-deleted annexes/works leak into the
      // generated PDF's list of works being sold. Mirrors getContractDetail.
      annexes: {
        where: { deletedAt: null },
        include: { works: { where: { deletedAt: null }, include: { credits: true } } },
      },
    },
  })
  if (!k) throw new Error('contract not found')

  // For a sale & assignment, gather the works being sold (for the consideration clause).
  const saleWorks = k.annexes.flatMap((a) =>
    a.works.map((w) => ({
      titleAr: w.title,
      performer: w.credits.find((c) => c.role === 'PERFORMER')?.name ?? (k.client.stageName ?? undefined),
    })),
  )

  const SETTLEMENT_AR: Record<string, string> = {
    MONTHLY: 'شهرية',
    QUARTERLY: 'ربع سنوية',
    SEMIANNUAL: 'نصف سنوية',
    ANNUAL: 'سنوية',
  }
  const dateAr = k.signedDate
    ? new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(
        k.signedDate,
      )
    : undefined

  const html = renderContract(k.grantType as Parameters<typeof renderContract>[0], {
    party1Name: k.client.legalName,
    party1StageName: k.client.stageName ?? undefined,
    party1NationalId: k.client.nationalId,
    party1Address: k.client.address ?? undefined,
    territory: k.territory,
    termMonths: k.termMonths,
    coverage: k.coverage as string[],
    revenueSharePct: k.revenueShareBps != null ? k.revenueShareBps / 100 : undefined,
    minPayoutUsd: k.minPayoutCents != null ? Math.round(k.minPayoutCents / 100) : undefined,
    settlementFreqAr: k.settlementFreq ? SETTLEMENT_AR[k.settlementFreq] : undefined,
    noticeDays: k.noticeDays,
    contractDateAr: dateAr,
    regNo: `${k.id.slice(-5).toUpperCase()} / ${(k.signedDate ?? k.createdAt).getFullYear()}`,
    // Sale & assignment (FULL_ASSIGNMENT): lump-sum buyout (reusing minPayoutCents
    // as the EGP buyout amount) + the list of works being sold.
    buyoutAmountEgp: k.minPayoutCents != null ? Math.round(k.minPayoutCents / 100) : undefined,
    works: saleWorks.length ? saleWorks : undefined,
  })

  const buf = await renderPdf(html)

  const filename = `contract-${k.id}-draft.pdf`
  const storageDir = path.resolve(STORAGE)
  await mkdir(storageDir, { recursive: true })
  const storagePath = path.join(storageDir, filename)
  await writeFile(storagePath, buf)

  const doc = await db.document.create({
    data: { filename, storagePath, status: 'DRAFT', contractId: k.id },
  })

  await writeAudit({
    actorId: u.id,
    action: 'CREATE',
    entity: 'Document',
    entityId: doc.id,
    after: { filename, status: 'DRAFT' },
  })
  // Best-effort Drive backup — outage must NOT fail the mutation
  try { await queues.drive.add('backup', { clientId: k.client.id }) } catch (err) {
    console.warn('[generateContractPdf] Drive enqueue failed (best-effort):', err)
  }

  return doc
}

export async function markExecuted(documentId: string, signedFilePath: string) {
  const u = await requireUser('update', 'Document')

  const doc = await db.document.update({
    where: { id: documentId },
    data: { status: 'EXECUTED', storagePath: signedFilePath },
  })

  await writeAudit({
    actorId: u.id,
    action: 'UPDATE',
    entity: 'Document',
    entityId: documentId,
    after: { status: 'EXECUTED', storagePath: signedFilePath },
  })

  return doc
}

export async function uploadDocument(input: {
  buffer: Buffer
  filename: string
  contractId?: string
  annexId?: string
  folderId?: string
}) {
  const u = await requireUser('create', 'Document')
  const storageDir = path.resolve(STORAGE)
  await mkdir(storageDir, { recursive: true })

  // Derive a safe on-disk filename from a server-generated UUID + sanitised extension.
  // The user-supplied filename is NEVER used as part of the on-disk path.
  const rawExt = path.extname(path.basename(input.filename))
  const safeExt = /^\.[a-zA-Z0-9]{1,10}$/.test(rawExt) ? rawExt : ''
  const onDiskName = randomUUID() + safeExt
  const storagePath = path.join(storageDir, onDiskName)

  // Defense-in-depth: assert the resolved path is still inside storageDir.
  const resolvedStorage = path.resolve(storageDir)
  const resolvedPath = path.resolve(storagePath)
  if (!resolvedPath.startsWith(resolvedStorage + path.sep) && resolvedPath !== resolvedStorage) {
    throw new Error('Path traversal detected')
  }

  // Sanitise the original filename for metadata / display use only.
  const safeDisplayName = input.filename.replace(/[\x00-\x1f\x7f]/g, '').trim() || 'upload'

  await writeFile(storagePath, input.buffer)
  const doc = await db.document.create({
    data: {
      filename: safeDisplayName,
      storagePath,
      status: 'EXECUTED',
      contractId: input.contractId,
      annexId: input.annexId,
      folderId: input.folderId,
    },
  })
  await writeAudit({
    actorId: u.id,
    action: 'CREATE',
    entity: 'Document',
    entityId: doc.id,
    after: { filename: safeDisplayName },
  })
  // Best-effort OCR enqueue — Redis outage must NOT fail the upload
  try {
    await queues.ocr.add('ocr', { documentId: doc.id, filePath: storagePath })
  } catch (err) {
    console.warn('[uploadDocument] OCR enqueue failed (best-effort):', err)
  }
  // Best-effort Drive backup — resolve owning clientId via contractId, annexId, or folderId
  try {
    let clientId: string | undefined
    if (input.contractId) {
      const k = await db.masterContract.findUnique({ where: { id: input.contractId }, select: { clientId: true } })
      clientId = k?.clientId
    } else if (input.annexId) {
      const a = await db.annex.findUnique({ where: { id: input.annexId }, include: { contract: { select: { clientId: true } } } })
      clientId = a?.contract?.clientId
    } else if (input.folderId) {
      const f = await db.folder.findUnique({ where: { id: input.folderId }, select: { clientId: true } })
      clientId = f?.clientId
    }
    if (clientId) await queues.drive.add('backup', { clientId })
  } catch (err) {
    console.warn('[uploadDocument] Drive enqueue failed (best-effort):', err)
  }
  return doc
}

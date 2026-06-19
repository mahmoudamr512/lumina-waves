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
    include: { client: true },
  })
  if (!k) throw new Error('contract not found')

  const html = renderContract(k.grantType as Parameters<typeof renderContract>[0], {
    party1Name: k.client.stageName ?? k.client.legalName,
    party1NationalId: k.client.nationalId,
    territory: k.territory,
    termMonths: k.termMonths,
    coverage: k.coverage as string[],
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
  // Best-effort Drive backup — resolve owning clientId via contractId or annexId
  try {
    let clientId: string | undefined
    if (input.contractId) {
      const k = await db.masterContract.findUnique({ where: { id: input.contractId }, select: { clientId: true } })
      clientId = k?.clientId
    } else if (input.annexId) {
      const a = await db.annex.findUnique({ where: { id: input.annexId }, include: { contract: { select: { clientId: true } } } })
      clientId = a?.contract?.clientId
    }
    if (clientId) await queues.drive.add('backup', { clientId })
  } catch (err) {
    console.warn('[uploadDocument] Drive enqueue failed (best-effort):', err)
  }
  return doc
}

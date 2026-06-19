import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
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
  const storagePath = path.join(storageDir, `${Date.now()}-${input.filename}`)
  await writeFile(storagePath, input.buffer)
  const doc = await db.document.create({
    data: {
      filename: input.filename,
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
    after: { filename: input.filename },
  })
  // Best-effort OCR enqueue — Redis outage must NOT fail the upload
  try {
    await queues.ocr.add('ocr', { documentId: doc.id, filePath: storagePath })
  } catch (err) {
    console.warn('[uploadDocument] OCR enqueue failed (best-effort):', err)
  }
  return doc
}

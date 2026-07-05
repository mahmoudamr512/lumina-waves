// tests/unit/documents.service.test.ts
import { vi, beforeEach } from 'vitest'
import path from 'node:path'

// Mock auth so requireUser returns a controllable actor
vi.mock('@/lib/auth', () => ({ requireUser: vi.fn(async () => ({ id: 'admin', role: 'ADMIN' })) }))

// Mock renderPdf so we never need Playwright / Chromium in unit tests
vi.mock('@/lib/pdf', () => ({ renderPdf: vi.fn(async () => Buffer.from('%PDF-fake')) }))

// Capture the data passed to the contract template so we can assert WHICH works
// (live vs soft-deleted) are rendered into the PDF.
const { renderContractSpy, renderAnnexSpy } = vi.hoisted(() => ({
  renderContractSpy: vi.fn<(grantType: unknown, opts: { works?: Array<{ titleAr: string }> }) => string>(
    () => '<html>fake</html>',
  ),
  renderAnnexSpy: vi.fn<(d: { works?: Array<{ titleAr: string }> }) => string>(() => '<html>annex</html>'),
}))
vi.mock('@/templates/contracts', () => ({ renderContract: renderContractSpy, renderAnnex: renderAnnexSpy }))

// Mock queue for uploadDocument tests — no Redis needed
vi.mock('@/lib/queue', () => ({
  connectionOptions: {},
  queues: {
    ocr: { add: vi.fn(async () => ({})), name: 'ocr' },
    index: { add: vi.fn(async () => ({})), name: 'index' },
    drive: { add: vi.fn(async () => ({})), name: 'drive' },
    mail: { add: vi.fn(async () => ({})), name: 'mail' },
  },
}))

import { generateContractPdf, generateAnnexPdf, markExecuted } from '@/services/documents'
import { createContract } from '@/services/contracts'
import { createAnnex } from '@/services/annexes'
import { createWork } from '@/services/works'
import { createClient } from '@/services/clients'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { AuthzError } from '@/lib/errors'
import { uploadDocument } from '@/services/documents'
import { queues } from '@/lib/queue'

const mockRequireUser = requireUser as ReturnType<typeof vi.fn>

// Unique 14-digit national IDs per run to keep the unique constraint happy
const RUN = Date.now().toString().slice(-6)
let seq = 0
function uid() {
  seq++
  return `1500${seq.toString().padStart(4, '0')}${RUN}`
}

beforeEach(() => {
  // Default to ADMIN for most tests
  mockRequireUser.mockResolvedValue({ id: 'admin', role: 'ADMIN' })
})

test('generateContractPdf creates a DRAFT document', async () => {
  const c = await createClient({ legalName: 'Gen Test', nationalId: uid() })
  const k = await createContract({
    clientId: c.id,
    grantType: 'DISTRIBUTION',
    territory: 'EGYPT',
    termMonths: 12,
    coverageMode: 'RBT_AND_DIGITAL',
  })

  const doc = await generateContractPdf(k.id)

  expect(doc.status).toBe('DRAFT')
  expect(doc.contractId).toBe(k.id)
  expect(doc.filename).toMatch(/contract-.+-draft\.pdf/)
})

test('generateAnnexPdf creates a prefilled DRAFT attached to the annex', async () => {
  const c = await createClient({ legalName: 'Annex Gen', nationalId: uid() })
  const k = await createContract({
    clientId: c.id,
    grantType: 'DISTRIBUTION',
    territory: 'EGYPT',
    termMonths: 12,
    coverageMode: 'RBT_AND_DIGITAL',
  })
  const annex = await createAnnex({ contractId: k.id, annexDate: new Date() })
  await createWork({ title: 'أغنية الاختبار', annexId: annex.id, credits: [{ role: 'PERFORMER', name: 'مطرب' }] })

  renderAnnexSpy.mockClear()
  const doc = await generateAnnexPdf(annex.id)

  expect(doc.status).toBe('DRAFT')
  expect(doc.annexId).toBe(annex.id)
  expect(doc.filename).toMatch(/annex-.+-draft\.pdf/)
  // The annex's live work is prefilled into the template.
  const passed = renderAnnexSpy.mock.calls[0][0]
  expect(passed.works?.some((w) => w.titleAr === 'أغنية الاختبار')).toBe(true)
})

test('generateAnnexPdf is rejected for non-ADMIN/LEGAL roles', async () => {
  const c = await createClient({ legalName: 'Annex RBAC', nationalId: uid() })
  const k = await createContract({
    clientId: c.id, grantType: 'DISTRIBUTION', territory: 'EGYPT', termMonths: 12, coverageMode: 'RBT_AND_DIGITAL',
  })
  const annex = await createAnnex({ contractId: k.id, annexDate: new Date() })
  mockRequireUser.mockResolvedValueOnce({ id: 'op', role: 'OPERATIONS' })
  await expect(generateAnnexPdf(annex.id)).rejects.toThrow(AuthzError)
})

test('generateContractPdf writes an audit row', async () => {
  const c = await createClient({ legalName: 'Audit Test', nationalId: uid() })
  const k = await createContract({
    clientId: c.id,
    grantType: 'SALE',
    territory: 'WORLDWIDE',
    termMonths: 24,
    coverageMode: 'RBT_AND_DIGITAL',
  })

  const doc = await generateContractPdf(k.id)

  const auditRow = await db.auditLog.findFirst({
    where: { entity: 'Document', entityId: doc.id, action: 'CREATE' },
  })
  expect(auditRow).not.toBeNull()
  expect(auditRow?.actorId).toBe('admin')
})

test('markExecuted flips document status to EXECUTED', async () => {
  const c = await createClient({ legalName: 'Execute Test', nationalId: uid() })
  const k = await createContract({
    clientId: c.id,
    grantType: 'DISTRIBUTION',
    territory: 'WORLDWIDE',
    termMonths: 6,
    coverageMode: 'RBT_AND_DIGITAL',
  })

  const draft = await generateContractPdf(k.id)
  expect(draft.status).toBe('DRAFT')

  const executed = await markExecuted(draft.id, '/signed/contract.pdf')

  expect(executed.status).toBe('EXECUTED')
  expect(executed.storagePath).toBe('/signed/contract.pdf')
})

test('markExecuted writes an audit row', async () => {
  const c = await createClient({ legalName: 'Execute Audit', nationalId: uid() })
  const k = await createContract({
    clientId: c.id,
    grantType: 'DISTRIBUTION',
    territory: 'EGYPT',
    termMonths: 12,
    coverageMode: 'RBT_AND_DIGITAL',
  })

  const draft = await generateContractPdf(k.id)
  const executed = await markExecuted(draft.id, '/signed/signed.pdf')

  const auditRow = await db.auditLog.findFirst({
    where: { entity: 'Document', entityId: executed.id, action: 'UPDATE' },
  })
  expect(auditRow).not.toBeNull()
})

test('generateContractPdf excludes soft-deleted annexes/works from the rendered PDF', async () => {
  renderContractSpy.mockClear()
  const c = await createClient({ legalName: 'SoftDelete PDF', nationalId: uid() })
  const k = await createContract({
    clientId: c.id,
    grantType: 'SALE',
    territory: 'EGYPT',
    termMonths: 12,
    coverageMode: 'RBT_AND_DIGITAL',
  })
  const annex = await createAnnex({ contractId: k.id, annexDate: new Date() })
  await createWork({ title: 'Live Work', annexId: annex.id, credits: [] })
  const deleted = await createWork({ title: 'Deleted Work', annexId: annex.id, credits: [] })
  // Soft-delete one work (sets deletedAt without cascading) — it must NOT appear
  // in the generated PDF's list of works being sold.
  await db.work.update({ where: { id: deleted.id }, data: { deletedAt: new Date() } })

  await generateContractPdf(k.id)

  const opts = renderContractSpy.mock.calls.at(-1)?.[1]
  const titles = (opts?.works ?? []).map((w) => w.titleAr)
  expect(titles).toContain('Live Work')
  expect(titles).not.toContain('Deleted Work')
})

test('generateContractPdf rejects OPERATIONS role (not in sensitive allowlist)', async () => {
  // OPERATIONS can `create` Documents per authz matrix, but the generated PDF embeds
  // the client's National ID — a sensitive field. Only ADMIN/LEGAL may produce such docs.
  mockRequireUser.mockResolvedValue({ id: 'ops-user', role: 'OPERATIONS' })

  const c = await createClient({ legalName: 'Ops Reject', nationalId: uid() })

  // Switch back to ADMIN to create the contract (OPERATIONS can also create contracts,
  // but we need to set up the fixture first to avoid touching the sensitive-gate logic
  // before we're ready to test it).
  mockRequireUser.mockResolvedValueOnce({ id: 'admin', role: 'ADMIN' }) // createClient above used the prior mock
  const k = await createContract({
    clientId: c.id,
    grantType: 'DISTRIBUTION',
    territory: 'EGYPT',
    termMonths: 12,
    coverageMode: 'RBT_AND_DIGITAL',
  })

  // Now try to generate as OPERATIONS — must be rejected
  mockRequireUser.mockResolvedValue({ id: 'ops-user', role: 'OPERATIONS' })

  await expect(generateContractPdf(k.id)).rejects.toThrow(AuthzError)
})

const mockOcrAdd = (queues.ocr.add as ReturnType<typeof vi.fn>)

test('uploadDocument creates a Document row and audit entry', async () => {
  const buf = Buffer.from('%PDF-fake-upload')
  const doc = await uploadDocument({ buffer: buf, filename: 'test-upload.pdf' })
  expect(doc.filename).toBe('test-upload.pdf')
  expect(doc.status).toBe('EXECUTED')

  const auditRow = await db.auditLog.findFirst({
    where: { entity: 'Document', entityId: doc.id, action: 'CREATE' },
  })
  expect(auditRow).not.toBeNull()
  expect(auditRow?.actorId).toBe('admin')
})

test('uploadDocument enqueues an OCR job (best-effort)', async () => {
  mockOcrAdd.mockClear()
  const buf = Buffer.from('%PDF-fake-upload-2')
  const doc = await uploadDocument({ buffer: buf, filename: 'test-upload2.pdf' })
  expect(mockOcrAdd).toHaveBeenCalledWith('ocr', expect.objectContaining({ documentId: doc.id }))
})

test('uploadDocument succeeds even when OCR enqueue throws', async () => {
  mockOcrAdd.mockRejectedValueOnce(new Error('Redis connection refused'))
  const buf = Buffer.from('%PDF-fake-upload-3')
  // Should NOT throw — OCR is best-effort
  const doc = await uploadDocument({ buffer: buf, filename: 'test-upload3.pdf' })
  expect(doc.filename).toBe('test-upload3.pdf')
  expect(doc.status).toBe('EXECUTED')
})

test('uploadDocument with traversal filename stores file inside STORAGE_DIR', async () => {
  const STORAGE_DIR = process.env.STORAGE_DIR ?? './.storage'
  const buf = Buffer.from('%PDF-traversal-test')
  const doc = await uploadDocument({ buffer: buf, filename: '../../evil.sh' })
  const resolved = path.resolve(doc.storagePath)
  const resolvedStorage = path.resolve(STORAGE_DIR)
  expect(resolved.startsWith(resolvedStorage + path.sep)).toBe(true)
  expect(path.basename(doc.storagePath)).not.toContain('..')
  expect(path.basename(doc.storagePath)).not.toMatch(/[/\\]/)
})

test('uploadDocument with deep traversal filename stays inside STORAGE_DIR', async () => {
  const STORAGE_DIR = process.env.STORAGE_DIR ?? './.storage'
  const buf = Buffer.from('%PDF-deep-traversal')
  const doc = await uploadDocument({ buffer: buf, filename: '../../../etc/passwd' })
  const resolved = path.resolve(doc.storagePath)
  const resolvedStorage = path.resolve(STORAGE_DIR)
  expect(resolved.startsWith(resolvedStorage + path.sep)).toBe(true)
})

test('uploadDocument preserves original filename as display metadata', async () => {
  const buf = Buffer.from('%PDF-meta')
  const doc = await uploadDocument({ buffer: buf, filename: '../../some-messy/../name.pdf' })
  // The document filename (metadata) should preserve the original (minus control chars),
  // but the on-disk storagePath basename must NOT contain '..' or path separators
  expect(doc.filename).toBe('../../some-messy/../name.pdf')
  expect(path.basename(doc.storagePath)).not.toContain('..')
  const STORAGE_DIR_3 = process.env.STORAGE_DIR ?? './.storage'
  expect(path.resolve(doc.storagePath).startsWith(path.resolve(STORAGE_DIR_3) + path.sep)).toBe(true)
})

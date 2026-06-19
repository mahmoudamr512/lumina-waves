// tests/unit/documents.service.test.ts
import { vi, beforeEach } from 'vitest'

// Mock auth so requireUser returns a controllable actor
vi.mock('@/lib/auth', () => ({ requireUser: vi.fn(async () => ({ id: 'admin', role: 'ADMIN' })) }))

// Mock renderPdf so we never need Playwright / Chromium in unit tests
vi.mock('@/lib/pdf', () => ({ renderPdf: vi.fn(async () => Buffer.from('%PDF-fake')) }))

import { generateContractPdf, markExecuted } from '@/services/documents'
import { createContract } from '@/services/contracts'
import { createClient } from '@/services/clients'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { AuthzError } from '@/lib/errors'

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
    grantType: 'EXCLUSIVE_LICENSE',
    territory: 'EGYPT',
    termMonths: 12,
    coverage: ['DIGITAL'],
  })

  const doc = await generateContractPdf(k.id)

  expect(doc.status).toBe('DRAFT')
  expect(doc.contractId).toBe(k.id)
  expect(doc.filename).toMatch(/contract-.+-draft\.pdf/)
})

test('generateContractPdf writes an audit row', async () => {
  const c = await createClient({ legalName: 'Audit Test', nationalId: uid() })
  const k = await createContract({
    clientId: c.id,
    grantType: 'FULL_ASSIGNMENT',
    territory: 'MENA',
    termMonths: 24,
    coverage: ['DIGITAL', 'BROADCAST'],
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
    grantType: 'MANAGEMENT',
    territory: 'WORLDWIDE',
    termMonths: 6,
    coverage: ['NAME_IMAGE'],
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
    grantType: 'NON_EXCLUSIVE_LICENSE',
    territory: 'EGYPT',
    termMonths: 12,
    coverage: ['SYNC'],
  })

  const draft = await generateContractPdf(k.id)
  const executed = await markExecuted(draft.id, '/signed/signed.pdf')

  const auditRow = await db.auditLog.findFirst({
    where: { entity: 'Document', entityId: executed.id, action: 'UPDATE' },
  })
  expect(auditRow).not.toBeNull()
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
    grantType: 'EXCLUSIVE_LICENSE',
    territory: 'EGYPT',
    termMonths: 12,
    coverage: ['DIGITAL'],
  })

  // Now try to generate as OPERATIONS — must be rejected
  mockRequireUser.mockResolvedValue({ id: 'ops-user', role: 'OPERATIONS' })

  await expect(generateContractPdf(k.id)).rejects.toThrow(AuthzError)
})

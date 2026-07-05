import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'
import { redactSensitive } from '@/lib/authz'
import { validateGrant, type CoverageMode } from '@/lib/rights'
import { queues } from '@/lib/queue'
import { notifyRecordActivity } from '@/services/notifications'

export async function createContract(input: {
  clientId: string
  grantType: 'SALE' | 'DISTRIBUTION'
  territory: string
  /** Optional — null for SALE (perpetual buyout), required for DISTRIBUTION. */
  termMonths?: number | null
  coverageMode: CoverageMode
  /** Free-text platform/service names to exclude from the granted coverage. */
  coverageExclusions?: string[]
  autoRenew?: boolean
  noticeDays?: number
  revenueShareBps?: number
  minPayoutCents?: number
  settlementFreq?: string
  signedDate?: Date
}) {
  const u = await requireUser('create', 'MasterContract')
  validateGrant({
    grantType: input.grantType,
    territory: input.territory,
    coverageMode: input.coverageMode,
    coverageExclusions: input.coverageExclusions,
  })
  // A SALE (بيع وتنازل) is a perpetual buyout → no termMonths, no expiry.
  // A DISTRIBUTION (توزيع) is term-based → auto-derive expiry from signedDate + term.
  const expiresAt =
    input.grantType === 'DISTRIBUTION' && input.signedDate && input.termMonths
      ? new Date(new Date(input.signedDate).setMonth(new Date(input.signedDate).getMonth() + input.termMonths))
      : null
  const termMonths = input.grantType === 'SALE' ? null : (input.termMonths ?? null)
  const coverageExclusions = (input.coverageExclusions ?? [])
    .map((s) => s.trim())
    .filter(Boolean)
  const row = await db.masterContract.create({
    data: { ...input, coverageExclusions, termMonths, expiresAt },
  })
  await writeAudit({ actorId: u.id, action: 'CREATE', entity: 'MasterContract', entityId: row.id, after: row })
  // Best-effort Drive backup — outage must NOT fail the mutation
  try { await queues.drive.add('backup', { clientId: row.clientId }) } catch (err) {
    console.warn('[createContract] Drive enqueue failed (best-effort):', err)
  }
  // Best-effort: notify watchers of the client about the new contract.
  try {
    await notifyRecordActivity({
      entity: 'MasterContract',
      entityId: row.id,
      clientId: row.clientId,
      actorId: u.id,
      title: 'تمت إضافة عقد جديد',
      href: `/contracts/${row.id}`,
    })
  } catch (err) {
    console.warn('[createContract] notify failed (best-effort):', err)
  }
  return redactSensitive(u.role, 'MasterContract', row)
}

export async function getContract(id: string) {
  const u = await requireUser('read', 'MasterContract')
  const row = await db.masterContract.findUnique({ where: { id }, include: { annexes: true, client: true } })
  return row ? redactSensitive(u.role, 'MasterContract', row) : null
}

export async function getContractDetail(id: string) {
  const u = await requireUser('read', 'MasterContract')
  const row = await db.masterContract.findUnique({
    where: { id },
    include: {
      client: true,
      documents: { where: { deletedAt: null } },
      annexes: {
        where: { deletedAt: null },
        orderBy: { number: 'asc' },
        include: {
          works: { where: { deletedAt: null }, include: { credits: true } },
          documents: { where: { deletedAt: null } },
        },
      },
    },
  })
  if (!row) return null
  const role = u.role
  const redactedContract = redactSensitive(role, 'MasterContract', row)
  const client = redactSensitive(role, 'Client', row.client)
  const documents = row.documents.map((d) => redactSensitive(role, 'Document', d))
  const annexes = row.annexes.map((a) => ({
    ...a,
    works: a.works,
    documents: a.documents.map((d) => redactSensitive(role, 'Document', d)),
  }))
  return { ...redactedContract, client, documents, annexes, role }
}

export async function listContracts() {
  const u = await requireUser('read', 'MasterContract')
  const rows = await db.masterContract.findMany({
    orderBy: { createdAt: 'desc' },
    include: { client: true },
  })
  return rows.map((r) => {
    const redactedContract = redactSensitive(u.role, 'MasterContract', r)
    const redactedClient = redactSensitive(u.role, 'Client', r.client)
    return { ...redactedContract, client: redactedClient }
  })
}

/** Move a contract to the trash (3-day recovery window). Admin-only in RBAC. */
export async function softDeleteContract(id: string) {
  const u = await requireUser('delete', 'MasterContract')
  const before = await db.masterContract.findUnique({ where: { id } })
  await db.$softDelete('MasterContract', id, new Date(Date.now() + 3 * 864e5))
  await writeAudit({ actorId: u.id, action: 'DELETE', entity: 'MasterContract', entityId: id, before })
  return { id }
}

/**
 * Permanent delete — soft-delete first (auth + audit + best-effort notify via
 * the soft path's side effects) then immediately set purgedAt so it bypasses
 * the 3-day trash window. The row stays in DB so audit/comment FKs remain valid.
 */
export async function hardDeleteContract(id: string) {
  const r = await softDeleteContract(id)
  await db.masterContract.updateMany({ where: { id }, data: { purgedAt: new Date() } })
  return r
}

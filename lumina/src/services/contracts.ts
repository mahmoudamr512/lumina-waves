import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'
import { redactSensitive } from '@/lib/authz'
import { validateGrant } from '@/lib/rights'
import { queues } from '@/lib/queue'

export async function createContract(input: {
  clientId: string
  grantType: 'FULL_ASSIGNMENT' | 'EXCLUSIVE_LICENSE' | 'NON_EXCLUSIVE_LICENSE' | 'MANAGEMENT'
  territory: string
  termMonths: number
  coverage: string[]
  autoRenew?: boolean
  noticeDays?: number
  revenueShareBps?: number
  minPayoutCents?: number
  settlementFreq?: string
  signedDate?: Date
}) {
  const u = await requireUser('create', 'MasterContract')
  validateGrant({ grantType: input.grantType, territory: input.territory, coverage: input.coverage })
  const row = await db.masterContract.create({ data: { ...input, coverage: input.coverage } })
  await writeAudit({ actorId: u.id, action: 'CREATE', entity: 'MasterContract', entityId: row.id, after: row })
  // Best-effort Drive backup — outage must NOT fail the mutation
  try { await queues.drive.add('backup', { clientId: row.clientId }) } catch (err) {
    console.warn('[createContract] Drive enqueue failed (best-effort):', err)
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

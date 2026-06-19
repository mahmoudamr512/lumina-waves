import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'
import { queues } from '@/lib/queue'

export async function createAnnex(input: { contractId: string; annexDate: Date }) {
  const u = await requireUser('create', 'Annex')
  const last = await db.annex.findFirst({
    where: { contractId: input.contractId },
    orderBy: { number: 'desc' },
  })
  const number = (last?.number ?? 0) + 1
  const row = await db.annex.create({
    data: { contractId: input.contractId, annexDate: input.annexDate, number },
  })
  await writeAudit({ actorId: u.id, action: 'CREATE', entity: 'Annex', entityId: row.id, after: row })
  // Best-effort Drive backup — resolve owning clientId via the contract
  try {
    const contract = await db.masterContract.findUnique({ where: { id: input.contractId }, select: { clientId: true } })
    if (contract) await queues.drive.add('backup', { clientId: contract.clientId })
  } catch (err) {
    console.warn('[createAnnex] Drive enqueue failed (best-effort):', err)
  }
  return row
}

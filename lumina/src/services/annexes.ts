import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'
import { queues } from '@/lib/queue'
import { notifyRecordActivity } from '@/services/notifications'

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
  let clientId: string | undefined
  try {
    const contract = await db.masterContract.findUnique({ where: { id: input.contractId }, select: { clientId: true } })
    clientId = contract?.clientId
    if (clientId) await queues.drive.add('backup', { clientId })
  } catch (err) {
    console.warn('[createAnnex] Drive enqueue failed (best-effort):', err)
  }
  try {
    await notifyRecordActivity({
      entity: 'MasterContract',
      entityId: input.contractId,
      clientId,
      actorId: u.id,
      title: `تمت إضافة ملحق جديد (#${number})`,
      href: `/contracts/${input.contractId}`,
    })
  } catch (err) {
    console.warn('[createAnnex] notify failed (best-effort):', err)
  }
  return row
}

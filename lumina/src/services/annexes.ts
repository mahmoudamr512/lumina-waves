import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'
import { queues } from '@/lib/queue'
import { notifyRecordActivity } from '@/services/notifications'

export async function createAnnex(input: { contractId: string; annexDate: Date }) {
  const u = await requireUser('create', 'Annex')
  // Include deleted rows: @@unique([contractId, number]) still covers them, so numbers are never reused.
  const last = await db.$includeDeleted.annex.findFirst({
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

/** Move an annex (and its works/documents) to the trash (3-day recovery window). Admin-only in RBAC. */
export async function softDeleteAnnex(id: string) {
  const u = await requireUser('delete', 'Annex')
  const before = await db.annex.findUniqueOrThrow({ where: { id } })
  const purgeAfter = new Date(Date.now() + 3 * 864e5)
  const data = { deletedAt: new Date(), purgeAfter }
  await db.work.updateMany({ where: { annexId: id, deletedAt: null }, data })
  await db.document.updateMany({ where: { annexId: id, deletedAt: null }, data })
  await db.$softDelete('Annex', id, purgeAfter)
  await writeAudit({ actorId: u.id, action: 'DELETE', entity: 'Annex', entityId: id, before })
  try {
    const contract = await db.masterContract.findUnique({ where: { id: before.contractId }, select: { clientId: true } })
    if (contract?.clientId) await queues.drive.add('backup', { clientId: contract.clientId })
  } catch (err) {
    console.warn('[softDeleteAnnex] Drive enqueue failed (best-effort):', err)
  }
  return { id, contractId: before.contractId }
}

/** Permanent delete — soft-delete first, then purge immediately (rows kept so FKs stay valid). */
export async function hardDeleteAnnex(id: string) {
  const r = await softDeleteAnnex(id)
  const purgedAt = new Date()
  await db.$includeDeleted.work.updateMany({ where: { annexId: id, purgedAt: null }, data: { purgedAt } })
  await db.$includeDeleted.document.updateMany({ where: { annexId: id, purgedAt: null }, data: { purgedAt } })
  await db.$includeDeleted.annex.update({ where: { id }, data: { purgedAt } })
  return r
}

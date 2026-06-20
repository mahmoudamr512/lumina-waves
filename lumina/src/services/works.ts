import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'
import { redactSensitive } from '@/lib/authz'

type CreditInput = { role: 'AUTHOR' | 'COMPOSER' | 'ARRANGER' | 'PERFORMER' | 'PRODUCER'; name: string }

export async function createWork(input: {
  title: string
  rightsAxis?: 'MASTER' | 'PUBLISHING' | 'BOTH'
  annexId?: string
  credits: CreditInput[]
}) {
  const u = await requireUser('create', 'Work')
  const row = await db.work.create({
    data: {
      title: input.title,
      rightsAxis: input.rightsAxis ?? 'BOTH',
      annexId: input.annexId,
      status: input.annexId ? 'LINKED' : 'PENDING_ANNEX',
      credits: { create: input.credits },
    },
    include: { credits: true },
  })
  await writeAudit({ actorId: u.id, action: 'CREATE', entity: 'Work', entityId: row.id, after: row })
  return row
}

export async function linkWorkToAnnex(workId: string, annexId: string) {
  const u = await requireUser('update', 'Work')
  const before = await db.work.findUnique({ where: { id: workId } })
  const row = await db.work.update({ where: { id: workId }, data: { annexId, status: 'LINKED' } })
  await writeAudit({ actorId: u.id, action: 'UPDATE', entity: 'Work', entityId: workId, before, after: row })
  return row
}

export async function listWorks() {
  const u = await requireUser('read', 'Work')
  const rows = await db.work.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: {
      credits: true,
      annex: { include: { contract: { include: { client: true } } } },
    },
  })
  return rows.map((w) => {
    // `where` isn't supported on to-one includes, so soft-deleted parent rows are
    // filtered here (the extension only filters top-level queries).
    const annexRow = w.annex && !w.annex.deletedAt ? w.annex : null
    const contractRow = annexRow?.contract && !annexRow.contract.deletedAt ? annexRow.contract : null
    const client = contractRow?.client
    const redactedClient = client ? redactSensitive(u.role, 'Client', client) : null
    // Each nested entity is redacted separately (per-role, fail-closed) — the
    // contract carries sensitive financial terms.
    const redactedContract = contractRow
      ? { ...redactSensitive(u.role, 'MasterContract', contractRow), client: redactedClient }
      : null
    const annex = annexRow ? { ...annexRow, contract: redactedContract } : null
    return { ...w, annex }
  })
}

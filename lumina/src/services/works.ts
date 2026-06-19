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
    orderBy: { createdAt: 'desc' },
    include: {
      credits: true,
      annex: {
        include: {
          contract: {
            include: { client: true },
          },
        },
      },
    },
  })
  return rows.map((w) => {
    const client = w.annex?.contract?.client
    const redactedClient = client ? redactSensitive(u.role, 'Client', client) : null
    const annex = w.annex
      ? {
          ...w.annex,
          contract: w.annex.contract
            ? { ...w.annex.contract, client: redactedClient }
            : null,
        }
      : null
    return { ...w, annex }
  })
}

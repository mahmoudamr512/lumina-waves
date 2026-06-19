import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'

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

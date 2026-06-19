import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'
import { queues } from '@/lib/queue'

// Authz entity reused from 'Work' — releases are creative metadata under the same domain.
// This avoids touching the authz matrix for the demo; revisit if granular Release perms are needed.

type CreditInput = { role: 'AUTHOR' | 'COMPOSER' | 'ARRANGER' | 'PERFORMER' | 'PRODUCER'; name: string }

export async function createRelease(input: {
  clientId: string
  title: string
  type?: 'SINGLE' | 'EP' | 'ALBUM'
  releaseDate?: Date
}) {
  const u = await requireUser('create', 'Work')
  const row = await db.release.create({
    data: {
      clientId: input.clientId,
      title: input.title,
      type: input.type ?? 'SINGLE',
      releaseDate: input.releaseDate,
      status: 'PLANNED',
    },
  })
  await writeAudit({ actorId: u.id, action: 'CREATE', entity: 'Release', entityId: row.id, after: row })
  // Best-effort Drive backup — outage must NOT fail the mutation
  try { await queues.drive.add('backup', { clientId: input.clientId }) } catch (err) {
    console.warn('[createRelease] Drive enqueue failed (best-effort):', err)
  }
  return row
}

export async function addTrackToRelease(input: {
  releaseId: string
  title: string
  credits: CreditInput[]
}) {
  const u = await requireUser('create', 'Work')
  const release = await db.release.findUnique({ where: { id: input.releaseId }, select: { clientId: true } })
  if (!release) throw new Error('release not found')

  const row = await db.work.create({
    data: {
      title: input.title,
      releaseId: input.releaseId,
      status: 'PENDING_ANNEX',
      rightsAxis: 'BOTH',
      credits: { create: input.credits },
    },
    include: { credits: true },
  })
  await writeAudit({ actorId: u.id, action: 'CREATE', entity: 'Work', entityId: row.id, after: row })
  // Best-effort Drive backup
  try { await queues.drive.add('backup', { clientId: release.clientId }) } catch (err) {
    console.warn('[addTrackToRelease] Drive enqueue failed (best-effort):', err)
  }
  return row
}

import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'
import { queues } from '@/lib/queue'

export async function createFolder(input: {
  clientId: string
  name: string
  parentId?: string
}) {
  const u = await requireUser('create', 'Document')
  // Integrity: a sub-folder's parent must belong to the same client (prevents
  // nesting a folder under another client's tree via a forged parentId).
  if (input.parentId) {
    const parent = await db.folder.findUnique({
      where: { id: input.parentId },
      select: { clientId: true },
    })
    if (!parent || parent.clientId !== input.clientId) {
      throw new Error('parent folder does not belong to this client')
    }
  }
  const row = await db.folder.create({
    data: {
      clientId: input.clientId,
      name: input.name,
      parentId: input.parentId,
    },
  })
  await writeAudit({ actorId: u.id, action: 'CREATE', entity: 'Folder', entityId: row.id, after: row })
  // Best-effort Drive backup — outage must NOT fail the mutation
  try { await queues.drive.add('backup', { clientId: input.clientId }) } catch (err) {
    console.warn('[createFolder] Drive enqueue failed (best-effort):', err)
  }
  return row
}

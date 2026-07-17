import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'
import { redactSensitive } from '@/lib/authz'
import { queues } from '@/lib/queue'
import { escapeHtml } from '@/templates/contracts/_layout'
import { notifyCreatorOnDelete } from '@/services/notifications'

export async function createClient(input: {
  legalName: string
  stageName?: string
  nationalId: string
  address?: string
  phone?: string
}) {
  if (!/^\d{14}$/.test(input.nationalId)) throw new Error('nationalId must be exactly 14 digits')
  const u = await requireUser('create', 'Client')
  const row = await db.client.create({ data: input })
  await writeAudit({ actorId: u.id, action: 'CREATE', entity: 'Client', entityId: row.id, after: row })
  // Best-effort Drive backup — outage must NOT fail the mutation
  try { await queues.drive.add('backup', { clientId: row.id }) } catch (err) {
    console.warn('[createClient] Drive enqueue failed (best-effort):', err)
  }
  return redactSensitive(u.role, 'Client', row)
}

export async function getClient(id: string) {
  const u = await requireUser('read', 'Client')
  const row = await db.client.findUnique({ where: { id } })
  return row ? redactSensitive(u.role, 'Client', row) : null
}

export async function listClients() {
  const u = await requireUser('read', 'Client')
  const rows = await db.client.findMany({ orderBy: { createdAt: 'desc' } })
  return rows.map((r) => redactSensitive(u.role, 'Client', r))
}

export async function updateClient(
  id: string,
  patch: Partial<{ legalName: string; stageName: string; address: string; phone: string }>,
) {
  const u = await requireUser('update', 'Client')
  const before = await db.client.findUnique({ where: { id } })
  const after = await db.client.update({ where: { id }, data: patch })
  await writeAudit({ actorId: u.id, action: 'UPDATE', entity: 'Client', entityId: id, before, after })
  // Best-effort Drive backup — outage must NOT fail the mutation
  try { await queues.drive.add('backup', { clientId: id }) } catch (err) {
    console.warn('[updateClient] Drive enqueue failed (best-effort):', err)
  }
  return redactSensitive(u.role, 'Client', after)
}

export async function getClientTree(id: string) {
  const u = await requireUser('read', 'Client')
  const row = await db.client.findUnique({
    where: { id },
    include: {
      contracts: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: {
          annexes: {
            where: { deletedAt: null },
            orderBy: { number: 'asc' },
            include: {
              works: {
                where: { deletedAt: null },
                include: { credits: true },
              },
              documents: { where: { deletedAt: null } },
            },
          },
          documents: { where: { deletedAt: null } },
        },
      },
      releases: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: {
          works: {
            where: { deletedAt: null },
            include: { credits: true },
          },
        },
      },
      folders: {
        where: { deletedAt: null, parentId: null },
        orderBy: { name: 'asc' },
        include: {
          documents: { where: { deletedAt: null } },
          children: {
            where: { deletedAt: null },
            orderBy: { name: 'asc' },
            include: {
              documents: { where: { deletedAt: null } },
            },
          },
        },
      },
    },
  })
  if (!row) return null
  const role = u.role
  const redactedClient = redactSensitive(role, 'Client', row)
  const contracts = row.contracts.map((c) => {
    const redactedContract = redactSensitive(role, 'MasterContract', c)
    const documents = c.documents.map((d) => redactSensitive(role, 'Document', d))
    const annexes = c.annexes.map((a) => ({
      ...a,
      works: a.works,
      documents: a.documents.map((d) => redactSensitive(role, 'Document', d)),
    }))
    return { ...redactedContract, annexes, documents }
  })
  return { ...redactedClient, contracts, releases: row.releases, folders: row.folders, role }
}

/**
 * Cascade soft-delete every entity that belongs to this client so it disappears
 * from the UI the same way the client does. Without this, deleting a client
 * would leave orphan contracts/annexes/works/documents accessible via direct
 * URLs. Runs BEFORE the client's own $softDelete so nested reads still work.
 */
async function cascadeSoftDeleteClientChildren(clientId: string, deletedAt: Date, purgeAfter: Date) {
  const data = { deletedAt, purgeAfter }
  // Fetch descendant ids FIRST, then updateMany by id. Prisma's updateMany does
  // NOT accept nested relation filters (e.g. `where: { annex: { contract: {…} } }`),
  // which silently produces zero-row updates and leaves works/annexes stranded
  // — the exact bug reported earlier. Explicit id fetches make the cascade
  // deterministic and covered by the soft-delete extension consistently.
  const contracts = await db.masterContract.findMany({
    where: { clientId, deletedAt: null },
    select: { id: true },
  })
  const contractIds = contracts.map((c) => c.id)
  const annexes = contractIds.length
    ? await db.annex.findMany({
        where: { contractId: { in: contractIds }, deletedAt: null },
        select: { id: true },
      })
    : []
  const annexIds = annexes.map((a) => a.id)
  const folders = await db.folder.findMany({
    where: { clientId, deletedAt: null },
    select: { id: true },
  })
  const folderIds = folders.map((f) => f.id)

  if (contractIds.length) await db.masterContract.updateMany({ where: { id: { in: contractIds } }, data })
  if (annexIds.length) await db.annex.updateMany({ where: { id: { in: annexIds } }, data })
  if (annexIds.length) {
    await db.work.updateMany({
      where: { annexId: { in: annexIds }, deletedAt: null },
      data,
    })
  }
  const docWhere = {
    OR: [
      contractIds.length ? { contractId: { in: contractIds } } : undefined,
      annexIds.length ? { annexId: { in: annexIds } } : undefined,
      folderIds.length ? { folderId: { in: folderIds } } : undefined,
    ].filter(Boolean) as Array<Record<string, unknown>>,
  }
  if (docWhere.OR.length) {
    await db.document.updateMany({ where: { ...docWhere, deletedAt: null }, data })
  }
  if (folderIds.length) await db.folder.updateMany({ where: { id: { in: folderIds } }, data })
  await db.release.updateMany({ where: { clientId, deletedAt: null }, data })
}

export async function softDeleteClient(id: string) {
  const u = await requireUser('delete', 'Client')
  const before = await db.client.findUnique({ where: { id } })
  const deletedAt = new Date()
  const purgeAfter = new Date(Date.now() + 3 * 864e5)
  await cascadeSoftDeleteClientChildren(id, deletedAt, purgeAfter)
  await db.$softDelete('Client', id, purgeAfter)
  await writeAudit({ actorId: u.id, action: 'DELETE', entity: 'Client', entityId: id, before })
  // Best-effort Drive backup — outage must NOT fail the mutation
  try { await queues.drive.add('backup', { clientId: id }) } catch (err) {
    console.warn('[softDeleteClient] Drive enqueue failed (best-effort):', err)
  }
  // Best-effort admin alert — SMTP not required; failure must NOT fail the mutation
  try {
    const alertTo =
      process.env.ALERT_EMAIL ??
      process.env.SEED_ADMIN_EMAIL ??
      process.env.MAIL_FROM ??
      ''
    if (alertTo) {
      // Escape every interpolated value (id is a stored cuid; name is user-supplied)
      // before placing it in email HTML to prevent HTML/script injection.
      const safeId = escapeHtml(before?.id ?? id)
      const safeName = escapeHtml(before?.stageName ?? before?.legalName ?? '')
      await queues.mail.add('mail', {
        to: alertTo,
        subject: 'حذف عنصر — قابل للاسترجاع خلال 3 أيام',
        html: `<p>تم حذف العميل ${safeName} (المعرّف: ${safeId}) وهو قابل للاسترجاع لمدة 3 أيام.</p>`,
      })
    }
  } catch (err) {
    console.warn('[softDeleteClient] Mail enqueue failed (best-effort):', err)
  }
  // Best-effort: notify the client's original creator that it was moved to trash.
  try {
    await notifyCreatorOnDelete('Client', id, u.id, before?.stageName ?? before?.legalName ?? 'عميل')
  } catch (err) {
    console.warn('[softDeleteClient] creator notify failed (best-effort):', err)
  }
}

/**
 * Permanent delete — soft-delete first (auth + audit + best-effort creator
 * notify + Drive backup + admin mail + cascade) then immediately set purgedAt
 * on the client and all its children, so it bypasses the 3-day trash window.
 * Row stays in DB so audit/comment FKs remain valid; filtered out of every UI
 * by the soft-delete extension. Also SUFFIXES the nationalId with a purged
 * marker so the @unique constraint doesn't block re-creating a fresh client
 * with the same national id later.
 */
export async function hardDeleteClient(id: string) {
  await softDeleteClient(id)
  const now = new Date()
  // Same two-step id fetch as the soft-delete cascade so nested relation
  // filters don't silently no-op the updateMany.
  const contracts = await db.masterContract.findMany({ where: { clientId: id }, select: { id: true } })
  const contractIds = contracts.map((c) => c.id)
  const annexes = contractIds.length
    ? await db.annex.findMany({ where: { contractId: { in: contractIds } }, select: { id: true } })
    : []
  const annexIds = annexes.map((a) => a.id)
  const folders = await db.folder.findMany({ where: { clientId: id }, select: { id: true } })
  const folderIds = folders.map((f) => f.id)

  if (contractIds.length) await db.masterContract.updateMany({ where: { id: { in: contractIds } }, data: { purgedAt: now } })
  if (annexIds.length) await db.annex.updateMany({ where: { id: { in: annexIds } }, data: { purgedAt: now } })
  if (annexIds.length) await db.work.updateMany({ where: { annexId: { in: annexIds } }, data: { purgedAt: now } })
  const docOr = [
    contractIds.length ? { contractId: { in: contractIds } } : undefined,
    annexIds.length ? { annexId: { in: annexIds } } : undefined,
    folderIds.length ? { folderId: { in: folderIds } } : undefined,
  ].filter(Boolean) as Array<Record<string, unknown>>
  if (docOr.length) await db.document.updateMany({ where: { OR: docOr }, data: { purgedAt: now } })
  if (folderIds.length) await db.folder.updateMany({ where: { id: { in: folderIds } }, data: { purgedAt: now } })
  await db.release.updateMany({ where: { clientId: id }, data: { purgedAt: now } })

  // Free the nationalId for reuse: suffix the purged client's NID so the
  // @unique constraint no longer blocks creating a fresh client with the
  // original number. The suffix keeps the original value recoverable in audit.
  const client = await db.client.findFirst({
    where: { id },
    select: { nationalId: true },
  })
  if (client?.nationalId && !client.nationalId.includes('|purged|')) {
    await db.client.updateMany({
      where: { id },
      data: { nationalId: `${client.nationalId}|purged|${now.getTime()}`, purgedAt: now },
    })
  } else {
    await db.client.updateMany({ where: { id }, data: { purgedAt: now } })
  }
  return { id }
}

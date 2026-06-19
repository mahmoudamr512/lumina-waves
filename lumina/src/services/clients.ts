import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'
import { redactSensitive } from '@/lib/authz'
import { queues } from '@/lib/queue'
import { escapeHtml } from '@/templates/contracts/_layout'

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

export async function softDeleteClient(id: string) {
  const u = await requireUser('delete', 'Client')
  const before = await db.client.findUnique({ where: { id } })
  await db.$softDelete('Client', id, new Date(Date.now() + 3 * 864e5))
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
}

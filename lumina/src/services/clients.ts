import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'
import { redactSensitive } from '@/lib/authz'

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
  return redactSensitive(u.role, 'Client', after)
}

export async function softDeleteClient(id: string) {
  const u = await requireUser('delete', 'Client')
  const before = await db.client.findUnique({ where: { id } })
  await db.$softDelete('Client', id, new Date(Date.now() + 3 * 864e5))
  await writeAudit({ actorId: u.id, action: 'DELETE', entity: 'Client', entityId: id, before })
}

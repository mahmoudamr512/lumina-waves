import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { hashPassword } from '@/lib/password'
import { writeAudit } from '@/lib/audit'
import { ValidationError } from '@/lib/errors'
import { saveAvatarFile } from '@/lib/avatars'
import { notify, notifyUser, listAdminIds, notifyCreatorOnDelete } from '@/services/notifications'
import { queueEmail } from '@/lib/notify-email'
import type { Role } from '@/generated/prisma/client'

const ROLE_AR: Record<Role, string> = {
  ADMIN: 'مدير النظام',
  OPERATIONS: 'العمليات',
  LEGAL: 'الشؤون القانونية',
  FINANCE: 'المالية',
  VIEWER: 'مشاهد',
}

/** Fire a best-effort callback; notification/email failures never break the mutation. */
async function bestEffort(label: string, fn: () => Promise<void>) {
  try {
    await fn()
  } catch (err) {
    console.warn(`[users] ${label} notify failed (best-effort):`, err)
  }
}

/** Projection that NEVER includes passwordHash. */
const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  disabledAt: true,
  avatarPath: true,
  createdAt: true,
} as const

const PURGE_GRACE_MS = 90 * 24 * 60 * 60 * 1000

function isUniqueError(e: unknown): boolean {
  const m = e instanceof Error ? e.message : ''
  return m.includes('P2002') || m.toLowerCase().includes('unique constraint')
}

/** Reject acting on your own account for destructive/lockout-risky operations. */
function assertNotSelf(actingId: string, targetId: string) {
  if (actingId === targetId) throw new ValidationError('SELF_ACTION')
}

/** Reject an operation that would remove the system's last active admin. */
async function assertNotLastAdmin(targetId: string) {
  const target = await db.user.findUnique({ where: { id: targetId }, select: { role: true } })
  if (target?.role !== 'ADMIN') return
  const otherActiveAdmins = await db.user.count({
    where: { role: 'ADMIN', disabledAt: null, id: { not: targetId } },
  })
  if (otherActiveAdmins === 0) throw new ValidationError('LAST_ADMIN')
}

async function revokeUserSessions(userId: string) {
  await db.userSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } })
}

export async function listUsers() {
  await requireUser('read', 'User')
  return db.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      ...USER_SELECT,
      _count: { select: { sessions: { where: { revokedAt: null, expiresAt: { gt: new Date() } } } } },
    },
  })
}

export async function getUser(id: string) {
  await requireUser('read', 'User')
  return db.user.findUnique({ where: { id }, select: USER_SELECT })
}

export async function createUser(input: { email: string; name: string; role: Role; password: string }) {
  const u = await requireUser('create', 'User')
  try {
    const row = await db.user.create({
      data: {
        email: input.email,
        name: input.name,
        role: input.role,
        passwordHash: await hashPassword(input.password),
      },
      select: USER_SELECT,
    })
    await writeAudit({ actorId: u.id, action: 'CREATE', entity: 'User', entityId: row.id, after: row })
    await bestEffort('createUser', async () => {
      await notify({
        recipientIds: await listAdminIds(),
        actorId: u.id,
        type: 'ADMIN',
        entity: 'User',
        entityId: row.id,
        title: `تم إنشاء مستخدم جديد: ${row.name}`,
        href: '/users',
      })
    })
    return row
  } catch (e) {
    if (isUniqueError(e)) throw new ValidationError('DUPLICATE_EMAIL')
    throw e
  }
}

export async function updateUser(id: string, input: { name?: string; email?: string; phone?: string | null }) {
  const u = await requireUser('update', 'User')
  try {
    const row = await db.user.update({
      where: { id },
      data: { name: input.name, email: input.email, phone: input.phone },
      select: USER_SELECT,
    })
    await writeAudit({ actorId: u.id, action: 'UPDATE', entity: 'User', entityId: id, after: row })
    return row
  } catch (e) {
    if (isUniqueError(e)) throw new ValidationError('DUPLICATE_EMAIL')
    throw e
  }
}

export async function changeRole(id: string, role: Role) {
  const u = await requireUser('update', 'User')
  if (role !== 'ADMIN') {
    assertNotSelf(u.id, id) // can't demote yourself
    await assertNotLastAdmin(id) // can't demote the last admin
  }
  const row = await db.user.update({ where: { id }, data: { role }, select: USER_SELECT })
  await writeAudit({ actorId: u.id, action: 'UPDATE', entity: 'User', entityId: id, after: { role } })
  await bestEffort('changeRole', () =>
    notifyUser(id, {
      actorId: u.id,
      type: 'ACCOUNT',
      entity: 'User',
      entityId: id,
      title: `تم تغيير دورك إلى «${ROLE_AR[role]}»`,
      href: '/account',
    }),
  )
  return row
}

export async function setUserPassword(id: string, password: string) {
  const u = await requireUser('update', 'User')
  await db.user.update({ where: { id }, data: { passwordHash: await hashPassword(password) } })
  await revokeUserSessions(id) // force re-login everywhere after an admin reset
  await writeAudit({ actorId: u.id, action: 'UPDATE', entity: 'User', entityId: id, after: { passwordReset: true } })
  await bestEffort('setUserPassword', async () => {
    const target = await db.user.findUnique({ where: { id }, select: { email: true } })
    const title = 'تمت إعادة تعيين كلمة المرور الخاصة بك'
    await notifyUser(id, { actorId: u.id, type: 'ACCOUNT', entity: 'User', entityId: id, title, href: '/account' })
    if (target?.email) {
      await queueEmail(
        target.email,
        title,
        `<p>${title} بواسطة أحد المسؤولين. تم تسجيل خروجك من جميع الأجهزة؛ يرجى تسجيل الدخول بكلمة المرور الجديدة.</p>`,
      )
    }
  })
  return getUser(id)
}

export async function disableUser(id: string) {
  const u = await requireUser('update', 'User')
  assertNotSelf(u.id, id)
  await assertNotLastAdmin(id)
  const row = await db.user.update({ where: { id }, data: { disabledAt: new Date() }, select: USER_SELECT })
  await revokeUserSessions(id)
  await writeAudit({ actorId: u.id, action: 'UPDATE', entity: 'User', entityId: id, after: { disabled: true } })
  await bestEffort('disableUser', async () => {
    const title = 'تم تعطيل حسابك'
    await notifyUser(id, { actorId: u.id, type: 'ACCOUNT', entity: 'User', entityId: id, title, href: '/login' })
    if (row.email) await queueEmail(row.email, title, `<p>${title}. للاستفسار يرجى التواصل مع مسؤول النظام.</p>`)
  })
  return row
}

export async function enableUser(id: string) {
  const u = await requireUser('update', 'User')
  const row = await db.user.update({ where: { id }, data: { disabledAt: null }, select: USER_SELECT })
  await writeAudit({ actorId: u.id, action: 'UPDATE', entity: 'User', entityId: id, after: { disabled: false } })
  return row
}

export async function deleteUser(id: string) {
  const u = await requireUser('delete', 'User')
  assertNotSelf(u.id, id)
  await assertNotLastAdmin(id)
  const target = await db.user.findUnique({ where: { id }, select: { name: true } })
  await revokeUserSessions(id)
  await db.$softDelete('User', id, new Date(Date.now() + PURGE_GRACE_MS))
  await writeAudit({ actorId: u.id, action: 'DELETE', entity: 'User', entityId: id })
  await bestEffort('deleteUser', () => notifyCreatorOnDelete('User', id, u.id, target?.name ?? 'مستخدم'))
  return { id }
}

export async function setUserAvatar(id: string, file: File) {
  const u = await requireUser('update', 'User')
  const avatarPath = await saveAvatarFile(file)
  const row = await db.user.update({ where: { id }, data: { avatarPath }, select: USER_SELECT })
  await writeAudit({ actorId: u.id, action: 'UPDATE', entity: 'User', entityId: id, after: { avatar: true } })
  return row
}

export async function removeUserAvatar(id: string) {
  const u = await requireUser('update', 'User')
  const row = await db.user.update({ where: { id }, data: { avatarPath: null }, select: USER_SELECT })
  await writeAudit({ actorId: u.id, action: 'UPDATE', entity: 'User', entityId: id, after: { avatar: false } })
  return row
}

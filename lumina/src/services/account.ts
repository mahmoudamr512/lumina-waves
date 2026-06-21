import { db } from '@/lib/db'
import { loadSession } from '@/lib/session'
import { hashPassword, verifyPassword } from '@/lib/password'
import { writeAudit } from '@/lib/audit'
import { AuthzError, ValidationError } from '@/lib/errors'
import { saveAvatarFile } from '@/lib/avatars'

const PROFILE_SELECT = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  avatarPath: true,
  createdAt: true,
} as const

function isUniqueError(e: unknown): boolean {
  const m = e instanceof Error ? e.message : ''
  return m.includes('P2002') || m.toLowerCase().includes('unique constraint')
}

async function me() {
  const s = await loadSession()
  if (!s) throw new AuthzError('UNAUTHENTICATED')
  return s
}

export async function getMyProfile() {
  const s = await me()
  return db.user.findUnique({ where: { id: s.id }, select: PROFILE_SELECT })
}

export async function updateMyProfile(input: { name?: string; phone?: string | null; email?: string }) {
  const s = await me()
  try {
    const row = await db.user.update({
      where: { id: s.id },
      data: { name: input.name, phone: input.phone, email: input.email },
      select: PROFILE_SELECT,
    })
    await writeAudit({ actorId: s.id, action: 'UPDATE', entity: 'User', entityId: s.id, after: { profile: true } })
    return row
  } catch (e) {
    if (isUniqueError(e)) throw new ValidationError('DUPLICATE_EMAIL')
    throw e
  }
}

export async function changeMyPassword(currentPassword: string, newPassword: string) {
  const s = await me()
  const row = await db.user.findUnique({ where: { id: s.id }, select: { passwordHash: true } })
  if (!row || !(await verifyPassword(currentPassword, row.passwordHash))) {
    throw new ValidationError('WRONG_PASSWORD')
  }
  await db.user.update({ where: { id: s.id }, data: { passwordHash: await hashPassword(newPassword) } })
  // Revoke this user's OTHER sessions (keep the current one).
  await db.userSession.updateMany({
    where: { userId: s.id, id: { not: s.sid }, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  await writeAudit({ actorId: s.id, action: 'UPDATE', entity: 'User', entityId: s.id, after: { passwordChanged: true } })
}

export async function setMyAvatar(file: File) {
  const s = await me()
  const avatarPath = await saveAvatarFile(file)
  const row = await db.user.update({ where: { id: s.id }, data: { avatarPath }, select: PROFILE_SELECT })
  await writeAudit({ actorId: s.id, action: 'UPDATE', entity: 'User', entityId: s.id, after: { avatar: true } })
  return row
}

export async function removeMyAvatar() {
  const s = await me()
  const row = await db.user.update({ where: { id: s.id }, data: { avatarPath: null }, select: PROFILE_SELECT })
  await writeAudit({ actorId: s.id, action: 'UPDATE', entity: 'User', entityId: s.id, after: { avatar: false } })
  return row
}

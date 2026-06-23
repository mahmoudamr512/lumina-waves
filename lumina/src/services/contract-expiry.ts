import { db } from '@/lib/db'
import { notify, listAdminLegalIds } from '@/services/notifications'
import { listWatcherIds } from '@/services/watchers'
import { queueEmail } from '@/lib/notify-email'

// Days-before buckets the reminder cadence fires at.
export const MILESTONES = [90, 30, 7, 0] as const

/** Whole days until expiry (negative once expired). */
export function daysUntil(expiresAt: Date, now: Date): number {
  return Math.ceil((expiresAt.getTime() - now.getTime()) / 86_400_000)
}

/**
 * The single milestone bucket a contract is currently in: the smallest configured
 * milestone the contract has reached (daysLeft <= milestone), or null if it's not
 * within any window yet. Each bucket fires exactly once (dedup via the reminder row),
 * so a contract crossing 90 → 30 → 7 → 0 produces one reminder per crossing.
 */
export function currentBucket(daysLeft: number): number | null {
  const reached = MILESTONES.filter((m) => daysLeft <= m)
  return reached.length ? Math.min(...reached) : null
}

/**
 * Daily cron entry: for every active contract with an expiry date, fire the due
 * milestone reminder (push + in-app + email) to watchers + ADMIN/LEGAL, once per
 * bucket. Pure-ish: accepts `now` for testability. Returns the number of reminders
 * sent. Best-effort per contract — one failure never aborts the rest.
 */
export async function sendContractExpiryReminders(now: Date = new Date()): Promise<number> {
  const contracts = await db.masterContract.findMany({
    where: { expiresAt: { not: null }, deletedAt: null },
    select: { id: true, clientId: true, expiresAt: true },
  })
  const adminLegal = await listAdminLegalIds()
  let sent = 0
  for (const c of contracts) {
    try {
      const daysLeft = daysUntil(c.expiresAt as Date, now)
      const bucket = currentBucket(daysLeft)
      if (bucket === null) continue
      const exists = await db.contractExpiryReminder.findUnique({
        where: { contractId_milestone: { contractId: c.id, milestone: bucket } },
      })
      if (exists) continue

      const ids = new Set<string>([
        ...adminLegal,
        ...(await listWatcherIds('MasterContract', c.id)),
        ...(await listWatcherIds('Client', c.clientId)),
      ])
      const title = daysLeft <= 0 ? 'انتهت صلاحية العقد' : `العقد ينتهي خلال ${daysLeft} يومًا`
      const href = `/contracts/${c.id}`
      await notify({ recipientIds: [...ids], type: 'EXPIRY', entity: 'MasterContract', entityId: c.id, title, href })

      const recipients = await db.user.findMany({ where: { id: { in: [...ids] } }, select: { email: true } })
      await Promise.all(
        recipients.map((u) =>
          queueEmail(u.email, title, `<p>${title}.</p><p><a href="https://luminawaves.com${href}">عرض العقد</a></p>`),
        ),
      )
      await db.contractExpiryReminder.create({ data: { contractId: c.id, milestone: bucket } })
      sent++
    } catch (err) {
      console.warn('[contract-expiry] reminder failed for', c.id, '(best-effort):', err)
    }
  }
  return sent
}

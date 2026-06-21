'use server'

import { loadSession, revokeSessionRecord } from '@/lib/session'
import { signOut } from '@/lib/auth'
import { writeAudit } from '@/lib/audit'

/**
 * Sign out: revoke the current session record (so it disappears from session
 * lists and can't be considered active) and clear the auth cookie.
 */
export async function signOutAction() {
  const me = await loadSession()
  if (me) {
    await revokeSessionRecord(me.sid)
    try {
      await writeAudit({ actorId: me.id, action: 'LOGOUT', entity: 'User', entityId: me.id })
    } catch (err) {
      console.warn('[signOut] logout audit failed (best-effort):', err)
    }
  }
  await signOut({ redirectTo: '/login' })
}

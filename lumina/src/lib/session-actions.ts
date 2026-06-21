'use server'

import { loadSession, revokeSessionRecord } from '@/lib/session'
import { signOut } from '@/lib/auth'

/**
 * Sign out: revoke the current session record (so it disappears from session
 * lists and can't be considered active) and clear the auth cookie.
 */
export async function signOutAction() {
  const me = await loadSession()
  if (me) await revokeSessionRecord(me.sid)
  await signOut({ redirectTo: '/login' })
}

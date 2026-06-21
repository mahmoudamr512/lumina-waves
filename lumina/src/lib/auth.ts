import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import { hashPassword, verifyPassword } from '@/lib/password'
import { can, type Action, type Entity } from '@/lib/authz'
import { AuthzError } from '@/lib/errors'
import { createSessionRecord, loadSession } from '@/lib/session'

export { hashPassword, verifyPassword }
export { AuthzError }

/**
 * A real bcrypt hash (cost 12) of a throwaway string used to keep the
 * credential-check path constant-time even when no user is found.
 * Running verifyPassword against this will always return false.
 * It is defined here once, at module load, so it is never recomputed per
 * request.
 */
const DUMMY_PASSWORD_HASH =
  '$2b$12$srCT42X/zHlNtkThsUpXKOW/WjaSKkEF1CZmFWnWW/bcdylmnWNZO'

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(c, req) {
        const user = await db.user.findUnique({ where: { email: String(c?.email) } })
        // Always run verifyPassword — even when no user is found — so both the
        // "user not found" and "wrong password" paths take similar wall-clock
        // time and do not leak which condition triggered via a timing side-channel.
        const hash = user?.passwordHash ?? DUMMY_PASSWORD_HASH
        const ok = await verifyPassword(String(c?.password), hash)
        if (!user || !ok) return null
        // Disabled or soft-deleted accounts cannot start a session.
        if (user.disabledAt || user.deletedAt) return null
        const ip = req?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined
        const userAgent = req?.headers?.get('user-agent') ?? undefined
        const sid = await createSessionRecord(user.id, ip, userAgent)
        return { id: user.id, email: user.email, name: user.name, role: user.role, sid }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.sid = user.sid
      }
      return token
    },
    session({ session, token }) {
      session.user.role = token.role
      session.user.id = token.sub ?? token.id
      session.user.sid = token.sid
      return session
    },
  },
})

/**
 * Authoritative request guard: validates the revocable session (live role,
 * not-revoked, not-expired, not-disabled) and enforces RBAC. Throws AuthzError.
 */
export async function requireUser(action: Action, entity: Entity) {
  const s = await loadSession()
  if (!s) throw new AuthzError('UNAUTHENTICATED')
  if (!can(s.role, action, entity)) throw new AuthzError('FORBIDDEN')
  return s
}

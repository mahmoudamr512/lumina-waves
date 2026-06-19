import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import { hashPassword, verifyPassword } from '@/lib/password'
import { can, type Action, type Entity } from '@/lib/authz'
import { AuthzError } from '@/lib/errors'

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
      async authorize(c) {
        const user = await db.user.findUnique({ where: { email: String(c?.email) } })
        // Always run verifyPassword — even when no user is found — so both the
        // "user not found" and "wrong password" paths take similar wall-clock
        // time and do not leak which condition triggered via a timing side-channel.
        const hash = user?.passwordHash ?? DUMMY_PASSWORD_HASH
        const ok = await verifyPassword(String(c?.password), hash)
        if (!user || !ok) return null
        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = user.role
      return token
    },
    session({ session, token }) {
      session.user.role = token.role
      session.user.id = token.sub ?? token.id
      return session
    },
  },
})

export async function requireUser(action: Action, entity: Entity) {
  const s = await auth()
  if (!s?.user) throw new AuthzError('UNAUTHENTICATED')
  const role = s.user.role
  if (!can(role, action, entity)) throw new AuthzError('FORBIDDEN')
  return { id: s.user.id, role }
}

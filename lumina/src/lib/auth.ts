import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import { hashPassword, verifyPassword } from '@/lib/password'
import { can, type Action, type Entity } from '@/lib/authz'

export { hashPassword, verifyPassword }

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(c) {
        const user = await db.user.findUnique({ where: { email: String(c?.email) } })
        if (!user || !(await verifyPassword(String(c?.password), user.passwordHash))) return null
        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = (user as any).role
      return token
    },
    session({ session, token }) {
      ;(session.user as any).role = token.role
      ;(session.user as any).id = token.sub
      return session
    },
  },
})

export async function requireUser(action: Action, entity: Entity) {
  const s = await auth()
  if (!s?.user) throw new Error('UNAUTHENTICATED')
  const role = (s.user as any).role
  if (!can(role, action, entity)) throw new Error('FORBIDDEN')
  return { id: (s.user as any).id as string, role }
}

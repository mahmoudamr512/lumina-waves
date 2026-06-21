import type { Role } from '@/generated/prisma/client'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: Role
      sid?: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }

  interface User {
    role: Role
    sid?: string
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id: string
    role: Role
    sid?: string
  }
}

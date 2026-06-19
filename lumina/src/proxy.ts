/**
 * proxy.ts — Next.js 16 Proxy (formerly Middleware)
 *
 * This file uses Next.js 16's `proxy.ts` file convention. In Next 16, the
 * Edge runtime interceptor was renamed from "Middleware" to "Proxy" — the
 * entry-point file is `proxy.ts` (or `proxy.js`) and the exported function
 * must be named `proxy`. See the official docs:
 *   app/api-reference/file-conventions/proxy
 * The build output confirms this with: ƒ Proxy (Middleware).
 *
 * Do NOT rename this file to middleware.ts — that would break the request
 * gate under Next 16.
 *
 * IMPORTANT: This proxy performs an OPTIMISTIC auth redirect for UX only
 * (redirect unauthenticated users to /login before they see a flash of
 * protected UI). It is NOT the authoritative authorization boundary.
 * Authoritative enforcement happens server-side in every service via
 * `requireUser()` (src/lib/auth.ts), which checks the session and RBAC
 * policy on every request, independent of what this proxy does.
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

// Public paths that do not require authentication
// Prefix-public paths (these and anything under them are open).
const PUBLIC_PATHS = ['/login', '/api/auth']
// Exact-public paths (open only at the exact path). The "/" landing shows the
// branded splash + login CTA; logged-in users are forwarded to /clients by the
// page itself.
const PUBLIC_EXACT = ['/']

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.includes(pathname)) return true
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths, static assets, and Next.js internals through unconditionally
  if (isPublic(pathname)) {
    return NextResponse.next()
  }

  const session = await auth()

  if (!session?.user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and images
    '/((?!_next/static|_next/image|favicon\\.ico|icon\\.svg|.*\\.png$).*)',
  ],
}

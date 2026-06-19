'use client'

import { signIn } from 'next-auth/react'
import { useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

/**
 * Credentials login form. Calls NextAuth v5 `signIn('credentials', …)` with
 * `redirect: false` so we can render a friendly Arabic error in-place rather
 * than navigating to NextAuth's default error page. On success we route to the
 * requested `callbackUrl` (defaulting to /clients) and refresh so the new
 * session is reflected server-side.
 */
export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const raw = searchParams.get('callbackUrl') ?? ''
  // Security: only accept internal paths — must start with '/' but not '//' (protocol-relative)
  const callbackUrl = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/clients'

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      email: String(form.get('email') ?? ''),
      password: String(form.get('password') ?? ''),
      redirect: false,
    })

    if (result?.error) {
      setError('بيانات الدخول غير صحيحة')
      setLoading(false)
      return
    }

    router.push(callbackUrl)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-5" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-muted">
          البريد الإلكتروني
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          dir="ltr"
          className="w-full rounded-lg border border-border-elevation bg-ink px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/60 focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400"
          placeholder="admin@luminawaves.com"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-muted">
          كلمة المرور
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          dir="ltr"
          className="w-full rounded-lg border border-border-elevation bg-ink px-3.5 py-2.5 text-sm text-foreground focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-center text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold-400 px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-gold-300 focus:outline-none focus:ring-2 focus:ring-gold-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading && (
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-ink/40 border-t-ink motion-reduce:animate-none"
          />
        )}
        {loading ? 'جارٍ الدخول…' : 'تسجيل الدخول'}
      </button>
    </form>
  )
}

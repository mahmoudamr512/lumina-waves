'use client'

import { signIn } from 'next-auth/react'
import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      email: form.get('email') as string,
      password: form.get('password') as string,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('بريد إلكتروني أو كلمة مرور غير صحيحة')
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-border-elevation bg-surface p-8 shadow-xl">
        <h1 className="text-center font-cinzel text-2xl font-semibold text-foreground">
          Lumina Waves
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="block text-sm text-muted">
              البريد الإلكتروني
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-border-elevation bg-ink px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-gold-500"
              placeholder="admin@luminawaves.com"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="block text-sm text-muted">
              كلمة المرور
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-border-elevation bg-ink px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-gold-500"
            />
          </div>

          {error && (
            <p className="text-center text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gold-600 px-4 py-2 text-sm font-medium text-ink transition hover:bg-gold-500 disabled:opacity-50"
          >
            {loading ? '…' : 'تسجيل الدخول'}
          </button>
        </form>
      </div>
    </main>
  )
}

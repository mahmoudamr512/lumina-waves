import { Suspense } from 'react'
import { AmbientBackground } from '@/components/layout'
import { LuminaLogo } from '@/components/brand'
import { FadeIn } from '@/components/motion'
import { InstallAppBanner } from '@/components/pwa/InstallAppBanner'
import { LoginForm } from './LoginForm'

export const metadata = {
  title: 'تسجيل الدخول | Lumina Waves',
}

/**
 * Login screen — branded, on the ink background with an ambient backdrop.
 * The interactive form lives in the `LoginForm` client component; this server
 * component owns only the chrome and brand lockup. The form reads `callbackUrl`
 * from the URL, so it is wrapped in <Suspense> (useSearchParams requirement).
 */
export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <AmbientBackground />

      <FadeIn className="flex w-full max-w-sm flex-col items-center gap-4" y={16} duration={0.7}>
        <div className="flex w-full flex-col items-center gap-8 rounded-2xl border border-border-elevation bg-surface/80 p-8 shadow-2xl backdrop-blur-sm sm:p-10">
          <LuminaLogo layout="stacked" size={96} title="Lumina Waves" />

          <div className="w-full space-y-1 text-center">
            <h1 className="text-lg font-medium text-foreground">تسجيل الدخول</h1>
            <p className="text-sm text-muted">نظام إدارة عمليات لومينا ويفز</p>
          </div>

          <Suspense fallback={<div className="h-48 w-full" aria-hidden="true" />}>
            <LoginForm />
          </Suspense>
        </div>

        {/* Mobile-browser-only "install the app" prompt (hidden when already installed / on desktop). */}
        <InstallAppBanner />
      </FadeIn>
    </main>
  )
}

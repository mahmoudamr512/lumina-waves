import type { ReactNode } from 'react';
import { LuminaLogo } from '@/components/brand';
import { AmbientBackground } from './AmbientBackground';

export interface AppShellProps {
  children: ReactNode;
  /**
   * Optional slot rendered inside the sticky header, replacing the minimal
   * logo-only bar. When provided, the caller is responsible for rendering the
   * full header content (logo + nav + user controls). When omitted, AppShell
   * renders its default minimal header (logo only) — used by the home /
   * showcase page and public routes.
   */
  nav?: ReactNode;
}

/**
 * Application chrome: ambient backdrop, a sticky top bar, and a responsive
 * content container. Accepts an optional `nav` slot so the authenticated app
 * layout can inject its full navigation without duplicating the shell scaffold.
 * When `nav` is omitted the shell renders a minimal logo-only header, keeping
 * the home/showcase page unchanged.
 */
export function AppShell({ children, nav }: AppShellProps) {
  return (
    <div className="relative flex min-h-full flex-col">
      <AmbientBackground />

      {nav ?? (
        <header className="sticky top-0 z-20 border-b border-border-elevation bg-ink/70 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-6xl items-center px-4 py-3 sm:px-6">
            <LuminaLogo layout="horizontal" size={36} title="Lumina Waves" />
          </div>
        </header>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}

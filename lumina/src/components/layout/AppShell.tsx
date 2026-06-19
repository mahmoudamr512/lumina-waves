import type { ReactNode } from 'react';
import { LuminaLogo } from '@/components/brand';
import { AmbientBackground } from './AmbientBackground';

export interface AppShellProps {
  children: ReactNode;
}

/**
 * Minimal application chrome: an ambient backdrop, a top bar carrying the
 * horizontal Lumina logo on the start side, and a responsive content container.
 * Mobile-first. Navigation/auth are intentionally out of scope here — real nav
 * arrives with the clients/contracts pages.
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative flex min-h-full flex-col">
      <AmbientBackground />

      <header className="sticky top-0 z-20 border-b border-border-elevation bg-ink/70 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center px-4 py-3 sm:px-6">
          <LuminaLogo layout="horizontal" size={36} title="Lumina Waves" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}

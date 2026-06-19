import { AppShell } from "@/components/layout";
import { LuminaLogo } from "@/components/brand";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion";

export default function Home() {
  return (
    <AppShell>
      <section className="flex min-h-[70vh] flex-col items-center justify-center text-center">
        <Stagger className="flex flex-col items-center" stagger={0.12} delayChildren={0.1}>
          <StaggerItem>
            <LuminaLogo layout="stacked" size={160} animated title="Lumina Waves" />
          </StaggerItem>

          <StaggerItem>
            <p className="mt-10 max-w-xl text-balance text-lg leading-relaxed text-muted sm:text-xl">
              نظام إدارة عمليات لومينا ويفز
            </p>
          </StaggerItem>

          <StaggerItem>
            <p className="mt-3 text-sm tracking-[0.35em] text-gold-600 uppercase">
              Operations System
            </p>
          </StaggerItem>
        </Stagger>

        <FadeIn delay={0.6} className="mt-16">
          <span className="inline-block h-px w-24 bg-border-elevation" />
        </FadeIn>
      </section>
    </AppShell>
  );
}

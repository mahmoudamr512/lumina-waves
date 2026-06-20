import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/layout";
import { LuminaLogo } from "@/components/brand";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion";

export default async function Home() {
  // Logged-in users go straight to the app; guests see the branded splash + login.
  const session = await auth();
  if (session?.user) redirect("/clients");

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

          <StaggerItem>
            <Link
              href="/login"
              className="mt-10 inline-flex items-center justify-center rounded-lg bg-gold-400 px-8 py-3 text-sm font-semibold text-ink transition hover:bg-gold-300 focus:outline-none focus:ring-2 focus:ring-gold-200"
            >
              الدخول إلى النظام
            </Link>
          </StaggerItem>
        </Stagger>

        <FadeIn delay={0.6} className="mt-16">
          <span className="inline-block h-px w-24 bg-border-elevation" />
        </FadeIn>
      </section>
    </AppShell>
  );
}

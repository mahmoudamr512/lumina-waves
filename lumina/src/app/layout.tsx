import type { Metadata, Viewport } from "next";
import { Cinzel, Tajawal } from "next/font/google";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { locales, dirFor, defaultLocale } from "@/i18n";
import "./globals.css";

// Display / Latin wordmark serif — Trajan-style. Used only for the wordmark + hero display.
const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Arabic-first UI body font; covers Arabic + Latin and reads cleanly on dark.
const tajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "لومينا ويفز | Lumina Waves",
  description: "نظام إدارة عمليات لومينا ويفز للإنتاج",
};

export const viewport: Viewport = {
  themeColor: "#0A0A0D",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const rawLocale = cookieStore.get("NEXT_LOCALE")?.value;
  const locale = (locales as readonly string[]).includes(rawLocale ?? '') ? rawLocale! : defaultLocale;
  const messages = (await import(`@/messages/${locale}.json`)).default;

  return (
    <html
      lang={locale}
      dir={dirFor(locale)}
      className={`${cinzel.variable} ${tajawal.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-ink text-foreground">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

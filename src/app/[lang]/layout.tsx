import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { getDict, isLang, LANGS } from "@/i18n";
import { getConfig } from "@/lib/store";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import WhatsAppButton from "@/components/WhatsAppButton";
import { display, sans } from "../fonts";
import "../globals.css";

type Props = { children: React.ReactNode; params: Promise<{ lang: string }> };

export const generateStaticParams = () => LANGS.map((lang) => ({ lang }));
export const dynamicParams = false;
// Prices, numbers and footer contacts come from the admin settings: always render fresh.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const t = getDict(isLang(lang) ? lang : "fr").meta;
  const l = isLang(lang) ? lang : "fr";
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t.title, template: "%s – Aurahair" },
    description: t.description,
    alternates: { canonical: `/${l}`, languages: { fr: "/fr", en: "/en" } },
    // Link previews on WhatsApp, Facebook, etc. Images made from public/media (1200×630).
    openGraph: {
      type: "website",
      siteName: "Aurahair",
      title: t.title,
      description: t.description,
      url: `/${l}`,
      locale: l === "fr" ? "fr_FR" : "en_US",
      images: [{ url: `/og-${l}.jpg`, width: 1200, height: 630, alt: t.title }],
    },
    twitter: { card: "summary_large_image", title: t.title, description: t.description, images: [`/og-${l}.jpg`] },
  };
}

/** Public address of the site, for absolute preview-image URLs. */
function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

export default async function LangLayout({ children, params }: Props) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const config = await getConfig();
  return (
    <html lang={lang} className={`${display.variable} ${sans.variable}`}>
      <body className="flex min-h-screen flex-col antialiased">
        <SiteHeader lang={lang} />
        <main className="flex-1">{children}</main>
        <SiteFooter lang={lang} contacts={config.contacts} />
        <WhatsAppButton lang={lang} phone={config.contacts[0]?.phone} />
        <Analytics />
      </body>
    </html>
  );
}

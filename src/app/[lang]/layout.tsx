import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDict, isLang, LANGS } from "@/i18n";
import { getConfig } from "@/lib/store";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
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
  return {
    title: { default: t.title, template: "%s – Aurahair" },
    description: t.description,
    alternates: { languages: { fr: "/fr", en: "/en" } },
  };
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
      </body>
    </html>
  );
}

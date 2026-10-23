import type { Metadata } from "next";
import { asLang, getDict } from "@/i18n";
import { getConfig } from "@/lib/store";
import OrderBuilder from "@/components/OrderBuilder";
import type { Mode } from "@/lib/types";
import { bakeMargins } from "@/lib/pricing";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<{ mode?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: getDict(asLang((await params).lang)).meta.commander };
}

export default async function CommanderPage({ params, searchParams }: Props) {
  const lang = asLang((await params).lang);
  const { mode } = await searchParams;
  const config = await getConfig();
  const initialMode: Mode = mode === "gros" ? "gros" : "detail";
  // Customer prices only: supplier prices and margins never reach the browser.
  const prices = { detail: bakeMargins(config, "detail"), gros: bakeMargins(config, "gros") };
  return <OrderBuilder prices={prices} initialMode={initialMode} lang={lang} />;
}

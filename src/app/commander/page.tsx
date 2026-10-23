import type { Metadata } from "next";
import { getConfig } from "@/lib/store";
import OrderBuilder from "@/components/OrderBuilder";
import type { Mode } from "@/lib/types";
import { bakeMargins } from "@/lib/pricing";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Calculer mon prix – Aura Hair" };

export default async function CommanderPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  const config = await getConfig();
  const initialMode: Mode = mode === "gros" ? "gros" : "detail";
  // Customer prices only: supplier prices and margins never reach the browser.
  const prices = { detail: bakeMargins(config, "detail"), gros: bakeMargins(config, "gros") };
  return <OrderBuilder prices={prices} initialMode={initialMode} />;
}

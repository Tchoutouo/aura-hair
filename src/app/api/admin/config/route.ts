import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { DEFAULT_CONFIG } from "@/lib/defaults";
import { saveConfig } from "@/lib/store";
import { CLOSURE_SIZES, LENGTHS, type Config, type PriceRow } from "@/lib/types";

export const runtime = "nodejs";

const num = (v: unknown, fallback: number) => {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};
const row = (v: unknown, fallback: PriceRow): PriceRow =>
  LENGTHS.map((_, i) => {
    const x = Array.isArray(v) ? v[i] : undefined;
    if (x === null || x === "" || x === undefined) return x === undefined ? fallback[i] ?? null : null;
    const n = parseFloat(String(x));
    return Number.isFinite(n) && n >= 0 ? n : null;
  });

function sanitize(input: Partial<Config>): Config {
  const d = DEFAULT_CONFIG;
  const fam = (f: "single-donor" | "virgin") =>
    Object.fromEntries(
      CLOSURE_SIZES.map((s) => [s, row(input.closures?.[f]?.[s], d.closures[f][s])]),
    ) as Config["closures"]["virgin"];
  return {
    rateFcfaPerUsd: num(input.rateFcfaPerUsd, d.rateFcfaPerUsd),
    shippingFcfaPerKg: num(input.shippingFcfaPerKg, d.shippingFcfaPerKg),
    margins: { gros: num(input.margins?.gros, d.margins.gros), detail: num(input.margins?.detail, d.margins.detail) },
    bundleWeightG: num(input.bundleWeightG, d.bundleWeightG),
    closureWeightG: Object.fromEntries(
      CLOSURE_SIZES.map((s) => [s, num(input.closureWeightG?.[s], d.closureWeightG[s])]),
    ) as Config["closureWeightG"],
    bundleRules: (Array.isArray(input.bundleRules) ? input.bundleRules : d.bundleRules)
      .slice(0, 10)
      .map((r) => ({ maxLength: num(r.maxLength, 30), bundles: num(r.bundles, 3) }))
      .sort((a, b) => a.maxLength - b.maxLength),
    qualities: d.qualities.map((q) => {
      const saved = input.qualities?.find((x) => x.id === q.id);
      return { ...q, name: String(saved?.name || q.name).slice(0, 80), bundle: row(saved?.bundle, q.bundle) };
    }),
    closures: { "single-donor": fam("single-donor"), virgin: fam("virgin") },
    lightSurchargeSingleDonor: (Array.isArray(input.lightSurchargeSingleDonor) ? input.lightSurchargeSingleDonor : d.lightSurchargeSingleDonor)
      .slice(0, 10)
      .map((r) => ({ maxLength: num(r.maxLength, 30), add: num(r.add, 0) }))
      .sort((a, b) => a.maxLength - b.maxLength),
    lightPriceVirgin: row(input.lightPriceVirgin, d.lightPriceVirgin),
    contacts: (Array.isArray(input.contacts) && input.contacts.length ? input.contacts : d.contacts)
      .slice(0, 6)
      .map((c) => ({ label: String(c.label ?? "").slice(0, 40), phone: String(c.phone ?? "").replace(/[^\d+]/g, "").slice(0, 20) }))
      .filter((c) => c.phone.length >= 8),
    orderEmail: String(input.orderEmail ?? "").trim().slice(0, 150),
  };
}

export async function PUT(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const input = (await req.json().catch(() => null)) as Partial<Config> | null;
  if (!input) return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  const cfg = sanitize(input);
  if (!cfg.contacts.length) {
    return NextResponse.json(
      { error: "Ajoutez au moins un numéro WhatsApp valide (8 chiffres minimum) : les commandes y sont envoyées." },
      { status: 400 },
    );
  }
  try {
    await saveConfig(cfg);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Échec de l'enregistrement." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, config: cfg });
}

import {
  LENGTHS,
  type CartItem,
  type CartQuote,
  type ClosureSize,
  type Config,
  type Family,
  type ItemQuote,
  type Length,
  type Mode,
  type Quality,
} from "./types";

const idx = (length: Length) => LENGTHS.indexOf(length);
const r2 = (n: number) => Math.round(n * 100) / 100;

export function bundlesForLength(config: Config, length: number): number {
  const rule = config.bundleRules.find((r) => length <= r.maxLength);
  return rule ? rule.bundles : config.bundleRules[config.bundleRules.length - 1]?.bundles ?? 3;
}

export function findQuality(config: Config, id: string): Quality | undefined {
  return config.qualities.find((q) => q.id === id);
}

/** Customer price for one bundle (100 g), or null if unavailable. */
export function bundlePrice(
  config: Config,
  mode: Mode,
  quality: Quality,
  length: Length,
  color: "natural" | "light",
): number | null {
  const i = idx(length);
  const base = quality.bundle[i];
  if (base == null) return null;
  const margin = config.margins[mode];
  if (color === "natural") return base + margin;
  if (quality.family === "virgin") {
    const light = config.lightPriceVirgin[i];
    return light == null ? null : light + margin;
  }
  const range = config.lightSurchargeSingleDonor.find((r) => length <= r.maxLength);
  return base + margin + (range?.add ?? 0);
}

/** Customer price for one closure / frontal piece, or null if unavailable. */
export function closurePrice(
  config: Config,
  mode: Mode,
  family: Family,
  size: ClosureSize,
  length: Length,
): number | null {
  const base = config.closures[family]?.[size]?.[idx(length)];
  return base == null ? null : base + config.margins[mode];
}

export const colorLabel = (c: "natural" | "light") =>
  c === "natural" ? "Couleur naturelle" : "Couleur claire (gray, blonde, 27, 613…)";

export const closureLabel = (size: ClosureSize) =>
  size.startsWith("13") ? `Frontal ${size}` : `Closure ${size}`;

export function quoteItem(config: Config, mode: Mode, item: CartItem): ItemQuote {
  const qty = Math.max(1, Math.floor(item.qty || 1));
  const fail = (title: string, error: string): ItemQuote => ({
    ok: false,
    error,
    title,
    lines: [],
    count: qty,
    usd: 0,
    weightG: 0,
  });

  if (item.kind === "closure") {
    const fam = item.family === "virgin" ? "Virgin" : "Single Donor";
    const title = `${closureLabel(item.size)} ${item.length}" – ${fam}`;
    const p = closurePrice(config, mode, item.family, item.size, item.length);
    if (p == null) return fail(title, "Taille non disponible pour cette longueur – sur demande.");
    const w = config.closureWeightG[item.size] ?? 50;
    return {
      ok: true,
      title,
      lines: [{ label: closureLabel(item.size), detail: `${item.length}"`, unitUsd: p, qty, totalUsd: r2(p * qty) }],
      count: 1,
      usd: r2(p * qty),
      weightG: w * qty,
    };
  }

  const quality = findQuality(config, item.quality);
  if (!quality) return fail("Produit inconnu", "Qualité introuvable.");

  if (item.kind === "bundle") {
    const title = `Mèches ${quality.name} – ${item.texture} ${item.length}"`;
    const p = bundlePrice(config, mode, quality, item.length, item.color);
    if (p == null) return fail(title, "Longueur non disponible.");
    return {
      ok: true,
      title,
      lines: [
        {
          label: `Paquet de mèches (100 g)`,
          detail: `${item.length}" · ${colorLabel(item.color)}`,
          unitUsd: p,
          qty,
          totalUsd: r2(p * qty),
        },
      ],
      count: 1,
      usd: r2(p * qty),
      weightG: config.bundleWeightG * qty,
    };
  }

  // Wig
  const title = `Perruque ${quality.name} – ${item.texture} ${item.length}"`;
  const p = bundlePrice(config, mode, quality, item.length, item.color);
  if (p == null) return fail(title, "Longueur non disponible.");
  const n = bundlesForLength(config, item.length);
  const lines = [
    {
      label: `Mèches : ${n.toString().replace(".", ",")} paquets`,
      detail: `${item.length}" · ${colorLabel(item.color)}`,
      unitUsd: p,
      qty: n,
      totalUsd: r2(p * n),
    },
  ];
  let weight = config.bundleWeightG * n;
  if (item.closure) {
    const c = closurePrice(config, mode, quality.family, item.closure, item.length);
    if (c == null)
      return fail(title, `${closureLabel(item.closure)} non disponible en ${item.length}" – choisissez une autre taille.`);
    lines.push({ label: closureLabel(item.closure), detail: `${item.length}"`, unitUsd: c, qty: 1, totalUsd: c });
    weight += config.closureWeightG[item.closure] ?? 50;
  }
  const one = r2(lines.reduce((s, l) => s + l.totalUsd, 0));
  return { ok: true, title, lines, count: qty, usd: r2(one * qty), weightG: weight * qty };
}

export function quoteCart(config: Config, mode: Mode, items: CartItem[]): CartQuote {
  const quotes = items.map((it) => quoteItem(config, mode, it));
  const productsUsd = r2(quotes.reduce((s, q) => s + q.usd, 0));
  const weightG = quotes.reduce((s, q) => s + q.weightG, 0);
  const weightKg = Math.round(weightG) / 1000;
  const rate = config.rateFcfaPerUsd;
  const shippingFcfa = Math.round(weightKg * config.shippingFcfaPerKg);
  const productsFcfa = Math.round(productsUsd * rate);
  return {
    items: quotes,
    productsUsd,
    productsFcfa,
    weightKg,
    shippingFcfa,
    shippingUsd: r2(shippingFcfa / rate),
    totalUsd: r2(productsUsd + shippingFcfa / rate),
    totalFcfa: productsFcfa + shippingFcfa,
    ok: quotes.length > 0 && quotes.every((q) => q.ok),
  };
}

export const fmtUsd = (n: number) =>
  "$" + (Number.isInteger(n) ? n.toString() : n.toFixed(2));

export const fmtFcfa = (n: number) =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " FCFA";

export const fmtKg = (kg: number) => kg.toFixed(2).replace(".", ",") + " kg";

/**
 * Customer-facing copy of the config for one mode: margins are baked into every
 * price and set to 0, so supplier prices never reach the browser.
 */
export function bakeMargins(config: Config, mode: Mode): Config {
  const m = config.margins[mode];
  const add = (row: (number | null)[]) => row.map((v) => (v == null ? null : v + m));
  const closures = Object.fromEntries(
    Object.entries(config.closures).map(([fam, sizes]) => [
      fam,
      Object.fromEntries(Object.entries(sizes).map(([s, row]) => [s, add(row)])),
    ]),
  ) as Config["closures"];
  return {
    ...config,
    margins: { gros: 0, detail: 0 },
    qualities: config.qualities.map((q) => ({ ...q, bundle: add(q.bundle) })),
    closures,
    lightPriceVirgin: add(config.lightPriceVirgin),
    orderEmail: "",
  };
}

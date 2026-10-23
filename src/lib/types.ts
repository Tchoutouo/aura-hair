export const LENGTHS = [6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30] as const;
export type Length = (typeof LENGTHS)[number];

export const CLOSURE_SIZES = ["2x4", "2x6", "4x4", "5x5", "6x6", "13x4", "13x6"] as const;
export type ClosureSize = (typeof CLOSURE_SIZES)[number];

export type Family = "single-donor" | "virgin";
export type Mode = "detail" | "gros";
export type Color = "natural" | "light";

/** A price list aligned with LENGTHS (index 0 = 6"). null = not available. */
export type PriceRow = (number | null)[];

export interface Quality {
  id: string;
  name: string;
  family: Family;
  /** Supplier price per bundle (100 g), USD */
  bundle: PriceRow;
}

export interface Config {
  /** 1 USD = rate FCFA */
  rateFcfaPerUsd: number;
  shippingFcfaPerKg: number;
  /** Added to every supplier price (per bundle / per piece), USD */
  margins: Record<Mode, number>;
  bundleWeightG: number;
  closureWeightG: Record<ClosureSize, number>;
  /** Wig bundle count by length: first rule whose maxLength >= length wins */
  bundleRules: { maxLength: number; bundles: number }[];
  qualities: Quality[];
  /** Supplier closure prices, per family, per size, aligned with LENGTHS */
  closures: Record<Family, Record<ClosureSize, PriceRow>>;
  /** Single donor: surcharge per bundle by length range (no margin added) */
  lightSurchargeSingleDonor: { maxLength: number; add: number }[];
  /** Virgin: full supplier price per bundle for light colours */
  lightPriceVirgin: PriceRow;
  contacts: { label: string; phone: string }[];
  orderEmail: string;
  updatedAt?: string;
}

export type CartItem =
  | {
      kind: "wig";
      quality: string;
      texture: string;
      length: Length;
      closure: ClosureSize | null;
      color: Color;
      qty: number;
    }
  | {
      kind: "bundle";
      quality: string;
      texture: string;
      length: Length;
      color: Color;
      qty: number;
    }
  | {
      kind: "closure";
      family: Family;
      size: ClosureSize;
      length: Length;
      qty: number;
    };

export interface QuoteLine {
  label: string;
  detail: string;
  unitUsd: number;
  qty: number;
  totalUsd: number;
}

export interface ItemQuote {
  ok: boolean;
  error?: string;
  title: string;
  lines: QuoteLine[];
  /** Number of identical wigs (1 for bundles/closures, whose qty is on the line) */
  count: number;
  usd: number;
  weightG: number;
}

export interface CartQuote {
  items: ItemQuote[];
  productsUsd: number;
  productsFcfa: number;
  weightKg: number;
  shippingFcfa: number;
  shippingUsd: number;
  totalUsd: number;
  totalFcfa: number;
  ok: boolean;
}

import { CLOSURE_SIZES, type ClosureSize, type Config, type PriceRow } from "./types";

/** Rows by length (8" → 30"), columns in CLOSURE_SIZES order. 6" has no closures. */
function closuresFromRows(rows: (number | null)[][]): Record<ClosureSize, PriceRow> {
  const out = {} as Record<ClosureSize, PriceRow>;
  CLOSURE_SIZES.forEach((size, col) => {
    out[size] = [null, ...rows.map((r) => r[col] ?? null)];
  });
  return out;
}

// Supplier prices (USD, per 100 g bundle or per piece). Margins are added on top.
export const DEFAULT_CONFIG: Config = {
  rateFcfaPerUsd: 600,
  shippingFcfaPerKg: 17000,
  margins: { gros: 2, detail: 5 },
  bundleWeightG: 100,
  closureWeightG: { "2x4": 30, "2x6": 40, "4x4": 40, "5x5": 50, "6x6": 60, "13x4": 80, "13x6": 100 },
  bundleRules: [
    { maxLength: 14, bundles: 2 },
    { maxLength: 24, bundles: 2.5 },
    { maxLength: 30, bundles: 3 },
  ],
  qualities: [
    {
      id: "sd-dd",
      name: "Single Donor – Double Drawn",
      family: "single-donor",
      bundle: [16, 22, 27, 32, 37, 46, 54, 66, 76, 86, 98, 114, 126],
    },
    {
      id: "sd-sd",
      name: "Single Donor – Super Double",
      family: "single-donor",
      bundle: [18, 24, 29, 34, 40, 49, 57, 69, 79, 89, 103, 119, 131],
    },
    {
      id: "virgin-sd",
      name: "Virgin – Super Double",
      family: "virgin",
      bundle: [16, 19, 23, 26, 30, 33, 41, 51, 56, 65, 74, 85, 97],
    },
  ],
  closures: {
    "single-donor": closuresFromRows([
      [16, 20, 24, 30, 36, 50, 56],
      [18, 22, 26, 32, 39, 56, 63],
      [20, 24, 28, 34, 42, 62, 69],
      [23, 27, 32, 39, 48, 68, 76],
      [26, 31, 35, 43, 53, 74, 83],
      [29, 34, 38, 47, 58, 80, 90],
      [35, 37, 45, 52, 63, 86, 97],
      [40, 44, 55, 61, 69, 92, 104],
      [44, 48, 58, 65, 76, 105, 119],
      [46, 54, 59, 68, 85, 112, 128],
      [48, 55, 63, 74, 91, 118, 138],
      [52, 68, 74, 85, 99, 130, 149],
    ]),
    virgin: closuresFromRows([
      [14, 16, 18, 25, 31, 39, 46],
      [15, 17, 21, 27, 34, 42, 50],
      [16, 19, 23, 29, 37, 46, 60],
      [18, 21, 27, 32, 43, 49, 66],
      [20, 25, 33, 38, 48, 55, 72],
      [26, 29, 39, 42, 53, 69, 78],
      [33, 36, 42, 49, 58, 76, 89],
      [39, 41, 51, 56, 64, 88, 102],
      [42, 46, 56, 62, 69, 95, 117],
      [44, 52, 60, 69, 75, 101, 122],
      [47, 59, 66, 76, 80, 108, null],
      [51, 66, 71, 83, 86, 114, null],
    ]),
  },
  lightSurchargeSingleDonor: [
    { maxLength: 12, add: 3 },
    { maxLength: 20, add: 8 },
    { maxLength: 30, add: 15 },
  ],
  lightPriceVirgin: [20, 25, 28, 35, 45, 58, 65, 72, 81, 92, 103, 119, 132],
  mountingFeeUsd: 10,
  shipWeekday: 5,
  transitDays: { min: 7, max: 10 },
  contacts: [
    { label: "Cameroun", phone: "+237656464859" },
    { label: "Cameroun (2)", phone: "+237655447247" },
    { label: "Vietnam", phone: "+84858754003" },
  ],
  orderEmail: "",
};

export const WHATSAPP_CHANNEL = "https://whatsapp.com/channel/0029VbE2wLZ1NCrRA1G3wP0y";

export const TEXTURES = [
  "Bone Straight",
  "Cambodian Wavy",
  "Loose Curly",
  "Tight Curly",
  "Twist Curly",
  "Burmese Curly",
  "Body Wave",
  "Blunt Tip",
  "Finger Curly",
  "Deep Curly",
  "Spring Curly",
  "Wavy Curly",
  "Water Wave",
  "Egg Curly",
  "Basic Curly",
  "Kinky Curly",
  "Flower Curly",
  "Loose Wave",
  "Fancy Curly",
  "Magic Curly",
  "Ring Curly",
  "Yaki Curly",
  "Pixie Curly",
  "Deep Wave",
  "Bouncy Curly",
] as const;

export function textureImage(name: string): string | null {
  if (name === "Bone Straight") return null;
  return `/textures/${name.toLowerCase().replace(/ /g, "-")}.jpg`;
}

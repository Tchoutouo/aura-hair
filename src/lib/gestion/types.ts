/**
 * Internal sales management (stock, sales, money) for the two partners.
 *
 * Money model:
 * - Customer payments go into the "caisse" (the business pot). `receivedBy` only says who physically got the money.
 * - Expenses are paid either by the caisse or personally by a partner (a personal "apport").
 * - Partners share everything 50/50, so the settlement only compares their personal contributions.
 * All amounts are whole FCFA, except supplier prices (USD).
 */

export const PARTNERS = ["yvaltt", "lisa"] as const;
export type Partner = (typeof PARTNERS)[number];
export type Payer = Partner | "caisse";

export const PARTNER_NAMES: Record<Partner, string> = { yvaltt: "Yvaltt", lisa: "Lisa" };
export const PAYER_NAMES: Record<Payer, string> = { ...PARTNER_NAMES, caisse: "Caisse Aurahair" };

export const METHODS = {
  momo: "MTN Mobile Money",
  om: "Orange Money",
  cash: "Espèces",
  virement: "Virement",
  autre: "Autre",
} as const;
export type Method = keyof typeof METHODS;

export const CATEGORIES = {
  fournisseur: "Paiement fournisseur",
  transport: "Transport / fret",
  frais: "Frais (transfert, banque)",
  montage: "Montage / coiffure",
  accessoires: "Accessoires et matériel",
  deplacement: "Déplacements (taxi…)",
  communication: "Connexion et crédit",
  marketing: "Publicité",
  autre: "Autre",
} as const;
export type Category = keyof typeof CATEGORIES;

/** A purchase from a supplier (one invoice). */
export interface Order {
  id: string;
  name: string;
  /** YYYY-MM-DD */
  date: string;
  supplier: string;
  /** FCFA paid per USD for this order */
  rate: number;
  discountUsd: number;
  /** Supplier fully paid: the order's cost is then exactly what was paid, fees included */
  settled: boolean;
  note?: string;
  createdAt: string;
}

export type ItemStatus = "stock" | "reserve" | "retire";
export const ITEM_STATUS: Record<ItemStatus, string> = { stock: "En stock", reserve: "Réservée", retire: "Retirée" };

/** One article (usually one wig) of an order. */
export interface Item {
  id: string;
  orderId: string;
  label: string;
  /** Supplier price in USD; also the weight used to spread transport and fees */
  costUsd: number;
  /** Asking price, FCFA */
  price?: number;
  /** Lowest acceptable price, FCFA */
  minPrice?: number;
  /** Manual status; "sold" comes from sales */
  status: ItemStatus;
  note?: string;
}

export interface Tranche {
  date: string;
  amount: number;
}

export interface Sale {
  id: string;
  /** Invoice number, increasing */
  number: number;
  date: string;
  customer: { name: string; phone: string };
  lines: { itemId: string; price: number }[];
  discount: number;
  /** Dollar rate applied when pricing this sale (information only) */
  rate?: number;
  /** Payment schedule; empty = everything due on the sale date */
  schedule: Tranche[];
  note?: string;
  /** Dates WhatsApp reminders were sent (ISO) */
  reminders: string[];
  createdAt: string;
}

/** Customer money coming in, always into the caisse. */
export interface Payment {
  id: string;
  kind: "payment";
  date: string;
  saleId: string;
  amount: number;
  method: Method;
  receivedBy: Partner;
  note?: string;
}

/** Money going out of the business. */
export interface Expense {
  id: string;
  kind: "expense";
  date: string;
  category: Category;
  label: string;
  amount: number;
  paidBy: Payer;
  /** When paid by the caisse: who physically paid */
  via?: Partner;
  /** Cost of this order (spread over its articles) */
  orderId?: string;
  /** Cost of this article only */
  itemId?: string;
  note?: string;
}

/**
 * Money moving inside the business:
 * partner → caisse (deposit), caisse → partner (withdrawal), partner → partner (settling up).
 */
export interface Transfer {
  id: string;
  kind: "transfer";
  date: string;
  from: Payer;
  to: Payer;
  amount: number;
  /** For caisse movements: who physically gives or keeps the money */
  via?: Partner;
  label?: string;
  note?: string;
}

export type Movement = Payment | Expense | Transfer;

export interface GestionData {
  orders: Order[];
  items: Item[];
  sales: Sale[];
  moves: Movement[];
}

export const COLLECTIONS = ["orders", "items", "sales", "moves"] as const;
export type Collection = (typeof COLLECTIONS)[number];

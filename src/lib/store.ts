import "server-only";
import { Redis } from "@upstash/redis";
import { DEFAULT_CONFIG } from "./defaults";
import type { Lang } from "@/i18n";
import { initialTracking, type Tracking } from "./tracking";
import type { CartItem, CartQuote, Config, Mode } from "./types";

const CONFIG_KEY = "aura:config";
const ORDERS_KEY = "aura:orders";
const REQUESTS_KEY = "aura:requests";
const TRACKING_KEY = "aura:tracking";
const REVIEWS_KEY = "aura:reviews";

let client: Redis | null | undefined;

export function redis(): Redis | null {
  if (client !== undefined) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  client = url && token ? new Redis({ url, token }) : null;
  return client;
}

export const storageReady = () => redis() !== null;

/** Saved config merged over defaults, so new fields always have a value. */
export async function getConfig(): Promise<Config> {
  const db = redis();
  let saved: Partial<Config> | null = null;
  if (db) {
    try {
      saved = await db.get<Partial<Config>>(CONFIG_KEY);
    } catch (e) {
      console.error("Redis getConfig failed", e);
    }
  }
  const cfg: Config = { ...DEFAULT_CONFIG, ...(saved ?? {}) };
  // Orders need a WhatsApp number to go to.
  if (!cfg.contacts?.length) cfg.contacts = DEFAULT_CONFIG.contacts;
  if (!cfg.orderEmail && process.env.ORDER_EMAIL_TO) cfg.orderEmail = process.env.ORDER_EMAIL_TO;
  return cfg;
}

export async function saveConfig(cfg: Config): Promise<void> {
  const db = redis();
  if (!db) throw new Error("Stockage non configuré (Upstash Redis).");
  await db.set(CONFIG_KEY, { ...cfg, updatedAt: new Date().toISOString() });
}

export interface StoredOrder {
  id: string;
  createdAt: string;
  mode: Mode;
  customer: Customer;
  items: CartItem[];
  quote: CartQuote;
  contact: string;
  rate: number;
  lang?: Lang;
}

export interface Customer {
  name: string;
  phone: string;
  city: string;
  email?: string;
  note?: string;
}

export async function saveOrder(order: StoredOrder): Promise<void> {
  const db = redis();
  if (!db) return;
  await db.lpush(ORDERS_KEY, order);
  await db.ltrim(ORDERS_KEY, 0, 499);
}

export async function listOrders(): Promise<StoredOrder[]> {
  const db = redis();
  if (!db) return [];
  try {
    return (await db.lrange<StoredOrder>(ORDERS_KEY, 0, 99)) ?? [];
  } catch (e) {
    console.error("Redis listOrders failed", e);
    return [];
  }
}

export type RequestSubject = "products" | "visa" | "exchange" | "other";

/** A message from the contact form (other services: purchases, visa, exchange…). */
export interface StoredRequest {
  id: string;
  createdAt: string;
  subject: RequestSubject;
  name: string;
  phone: string;
  email?: string;
  message: string;
  contact: string;
  lang: Lang;
}

export async function saveRequest(req: StoredRequest): Promise<void> {
  const db = redis();
  if (!db) return;
  await db.lpush(REQUESTS_KEY, req);
  await db.ltrim(REQUESTS_KEY, 0, 499);
}

export async function listRequests(): Promise<StoredRequest[]> {
  const db = redis();
  if (!db) return [];
  try {
    return (await db.lrange<StoredRequest>(REQUESTS_KEY, 0, 99)) ?? [];
  } catch (e) {
    console.error("Redis listRequests failed", e);
    return [];
  }
}

/** Looks an order up among the last 500 saved. */
export async function findOrder(id: string): Promise<StoredOrder | null> {
  const db = redis();
  if (!db) return null;
  const all = (await db.lrange<StoredOrder>(ORDERS_KEY, 0, 499)) ?? [];
  return all.find((o) => o.id === id) ?? null;
}

export async function getTracking(order: Pick<StoredOrder, "id" | "createdAt">): Promise<Tracking> {
  const db = redis();
  const saved = db ? await db.hget<Tracking>(TRACKING_KEY, order.id) : null;
  return saved ?? initialTracking(order.createdAt);
}

export async function getAllTracking(): Promise<Record<string, Tracking>> {
  const db = redis();
  if (!db) return {};
  try {
    return (await db.hgetall<Record<string, Tracking>>(TRACKING_KEY)) ?? {};
  } catch (e) {
    console.error("Redis getAllTracking failed", e);
    return {};
  }
}

export async function saveTracking(id: string, t: Tracking): Promise<void> {
  const db = redis();
  if (!db) throw new Error("Stockage non configuré (Upstash Redis).");
  await db.hset(TRACKING_KEY, { [id]: t });
}

export interface Review {
  id: string;
  createdAt: string;
  name: string;
  city: string;
  rating: number;
  text: string;
  lang: Lang;
  status: "pending" | "approved";
}

export async function listReviews(): Promise<Review[]> {
  const db = redis();
  if (!db) return [];
  try {
    const all = (await db.hgetall<Record<string, Review>>(REVIEWS_KEY)) ?? {};
    return Object.values(all).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (e) {
    console.error("Redis listReviews failed", e);
    return [];
  }
}

export async function saveReview(r: Review): Promise<void> {
  const db = redis();
  if (!db) throw new Error("Stockage non configuré (Upstash Redis).");
  await db.hset(REVIEWS_KEY, { [r.id]: r });
}

export async function deleteReview(id: string): Promise<void> {
  const db = redis();
  if (!db) throw new Error("Stockage non configuré (Upstash Redis).");
  await db.hdel(REVIEWS_KEY, id);
}

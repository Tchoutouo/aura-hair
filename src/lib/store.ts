import "server-only";
import { Redis } from "@upstash/redis";
import { DEFAULT_CONFIG } from "./defaults";
import type { CartItem, CartQuote, Config, Mode } from "./types";

const CONFIG_KEY = "aura:config";
const ORDERS_KEY = "aura:orders";

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

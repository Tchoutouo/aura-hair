import "server-only";
import { createHmac } from "crypto";
import { redis } from "../store";
import { COLLECTIONS, type Collection, type GestionData } from "./types";

const key = (c: Collection) => `gestion:${c}`;

function db() {
  const r = redis();
  if (!r) throw new Error("Stockage non configuré (Upstash Redis).");
  return r;
}

export async function loadGestion(): Promise<GestionData> {
  const r = redis();
  if (!r) return { orders: [], items: [], sales: [], moves: [], returns: [] };
  const [orders, items, sales, moves, returns] = await Promise.all(
    COLLECTIONS.map(async (c) => Object.values((await r.hgetall<Record<string, unknown>>(key(c))) ?? {})),
  );
  return {
    orders: (orders as GestionData["orders"]).sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name)),
    items: (items as GestionData["items"]).sort((a, b) => a.id.localeCompare(b.id)),
    sales: (sales as GestionData["sales"]).sort((a, b) => b.date.localeCompare(a.date) || b.number - a.number),
    moves: (moves as GestionData["moves"]).sort((a, b) => b.date.localeCompare(a.date)),
    returns: (returns as GestionData["returns"]).sort((a, b) => b.date.localeCompare(a.date) || b.number - a.number),
  };
}

/** Saves several records of one collection at once. */
export async function put<T extends { id: string }>(c: Collection, records: T[]): Promise<void> {
  if (!records.length) return;
  await db().hset(key(c), Object.fromEntries(records.map((x) => [x.id, x])));
}

export async function remove(c: Collection, ids: string[]): Promise<void> {
  if (ids.length) await db().hdel(key(c), ...ids);
}

/** Unguessable key for a sale's public invoice link. */
export function invoiceKey(saleId: string): string {
  const secret = process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || "";
  return createHmac("sha256", secret).update(`facture:${saleId}`).digest("hex").slice(0, 20);
}

export const invoiceKeys = (data: GestionData) => Object.fromEntries(data.sales.map((s) => [s.id, invoiceKey(s.id)]));

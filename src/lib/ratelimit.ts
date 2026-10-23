import "server-only";
import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { redis } from "./store";

type Rule = { limit: number; window: Duration; windowMs: number };

/** Abuse limits. Keys are an IP address or, for customer e-mail copies, the recipient. */
const RULES = {
  orders: { limit: 5, window: "10 m", windowMs: 10 * 60_000 },
  contact: { limit: 5, window: "10 m", windowMs: 10 * 60_000 },
  login: { limit: 5, window: "15 m", windowMs: 15 * 60_000 },
  customerEmail: { limit: 2, window: "24 h", windowMs: 24 * 3600_000 },
} satisfies Record<string, Rule>;

export type LimitName = keyof typeof RULES;

const limiters = new Map<LimitName, Ratelimit>();

// Fallback when Redis is not connected (local dev): per-instance memory only.
const memory = new Map<string, number[]>();

function memoryLimit(key: string, rule: Rule): boolean {
  const now = Date.now();
  const hits = (memory.get(key) ?? []).filter((t) => now - t < rule.windowMs);
  if (hits.length >= rule.limit) return false;
  hits.push(now);
  memory.set(key, hits);
  return true;
}

/** true if the action is allowed, false if the limit is reached. */
export async function allow(name: LimitName, id: string): Promise<boolean> {
  const rule = RULES[name];
  const db = redis();
  if (!db) return memoryLimit(`${name}:${id}`, rule);
  let rl = limiters.get(name);
  if (!rl) {
    rl = new Ratelimit({ redis: db, limiter: Ratelimit.slidingWindow(rule.limit, rule.window), prefix: `aura:rl:${name}` });
    limiters.set(name, rl);
  }
  try {
    return (await rl.limit(id)).success;
  } catch (e) {
    // Never block real customers because Redis is down.
    console.error("Ratelimit failed", e);
    return true;
  }
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || req.headers.get("x-real-ip") || "unknown";
}

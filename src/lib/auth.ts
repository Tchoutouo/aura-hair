import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "aura_admin";

function secret(): string | null {
  return process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || null;
}

function sign(value: string): string {
  return createHmac("sha256", secret() ?? "").update(value).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function checkPassword(input: string): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  return safeEqual(sign(input), sign(pw));
}

export function sessionToken(): string {
  const exp = Date.now() + 7 * 24 * 3600 * 1000;
  return `${exp}.${sign(`admin:${exp}`)}`;
}

export function isValidToken(token: string | undefined): boolean {
  if (!token || !secret()) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, sign(`admin:${exp}`));
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return isValidToken(jar.get(ADMIN_COOKIE)?.value);
}

export const adminConfigured = () => Boolean(process.env.ADMIN_PASSWORD);

import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "aura_admin";

/**
 * Who is logged in: each partner with their own password (ADMIN_PASSWORD_YVALTT, ADMIN_PASSWORD_LISA),
 * or "shared" with the common ADMIN_PASSWORD.
 */
export type AdminWho = "yvaltt" | "lisa" | "shared";

const PASSWORDS: [AdminWho, string | undefined][] = [
  ["yvaltt", process.env.ADMIN_PASSWORD_YVALTT],
  ["lisa", process.env.ADMIN_PASSWORD_LISA],
  ["shared", process.env.ADMIN_PASSWORD],
];

function secret(): string | null {
  return (
    process.env.ADMIN_SECRET ||
    process.env.ADMIN_PASSWORD ||
    [process.env.ADMIN_PASSWORD_YVALTT, process.env.ADMIN_PASSWORD_LISA].filter(Boolean).join(":") ||
    null
  );
}

function sign(value: string): string {
  return createHmac("sha256", secret() ?? "").update(value).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Whose password this is, or null. */
export function checkPassword(input: string): AdminWho | null {
  for (const [who, pw] of PASSWORDS) if (pw && safeEqual(sign(input), sign(pw))) return who;
  return null;
}

export function sessionToken(who: AdminWho): string {
  const exp = Date.now() + 7 * 24 * 3600 * 1000;
  return `${exp}.${who}.${sign(`admin:${exp}:${who}`)}`;
}

export function tokenWho(token: string | undefined): AdminWho | null {
  if (!token || !secret()) return null;
  const parts = token.split(".");
  // Sessions opened before personal passwords existed: "exp.sig".
  const [exp, who, sig] = parts.length === 2 ? [parts[0], "shared", parts[1]] : parts;
  if (!exp || !sig || Number(exp) < Date.now() || !PASSWORDS.some(([w]) => w === who)) return null;
  const expected = parts.length === 2 ? sign(`admin:${exp}`) : sign(`admin:${exp}:${who}`);
  return safeEqual(sig, expected) ? (who as AdminWho) : null;
}

/** Who is logged in to the admin, or null. */
export async function currentAdmin(): Promise<AdminWho | null> {
  const jar = await cookies();
  return tokenWho(jar.get(ADMIN_COOKIE)?.value);
}

export async function isAdmin(): Promise<boolean> {
  return (await currentAdmin()) !== null;
}

export const adminConfigured = () => PASSWORDS.some(([, pw]) => Boolean(pw));

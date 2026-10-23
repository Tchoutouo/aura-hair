import { NextResponse } from "next/server";
import { ADMIN_COOKIE, checkPassword, sessionToken } from "@/lib/auth";
import { allow, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await allow("login", clientIp(req)))) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans 15 minutes." },
      { status: 429 },
    );
  }
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  // Small delay to slow down guessing.
  await new Promise((r) => setTimeout(r, 400));
  if (!password || !checkPassword(password)) {
    return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 7 * 24 * 3600,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

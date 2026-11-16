import { NextResponse } from "next/server";
import { ADMIN_COOKIE, checkPassword, sessionToken } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { allow, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await allow("login", clientIp(req)))) {
    // At most one alert per hour and per connection.
    if (await allow("loginAlert", clientIp(req)))
      notify(req, {
        subject: "Tentatives de connexion bloquées",
        title: "Plusieurs mauvais mots de passe sur l'espace admin",
        rows: [["Que s'est-il passé ?", "5 mots de passe faux en 15 minutes : la connexion est bloquée pour cette adresse."]],
        lines: ["Si ce n'était ni Lisa ni Yvaltt, changez le mot de passe admin (ADMIN_PASSWORD) dans Vercel."],
      });
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans 15 minutes." },
      { status: 429 },
    );
  }
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  // Small delay to slow down guessing.
  await new Promise((r) => setTimeout(r, 400));
  const who = password ? checkPassword(password) : null;
  if (!who) {
    return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });
  }
  const name = who === "yvaltt" ? "Yvaltt" : who === "lisa" ? "Lisa" : "";
  notify(req, {
    subject: `Connexion à l'espace admin${name ? ` : ${name}` : ""}`,
    title: name ? `Connexion de ${name} à l'espace admin` : "Connexion à l'espace admin avec le mot de passe commun",
    actor: name || "Mot de passe commun",
    lines: ["Si ce n'était ni Lisa ni Yvaltt, changez le mot de passe admin (ADMIN_PASSWORD) dans Vercel puis redéployez."],
  });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, sessionToken(who), {
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

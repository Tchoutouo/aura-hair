import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { asLang, getDict } from "@/i18n";
import { waLink } from "@/lib/gestion/messages";
import { notify } from "@/lib/notify";
import { allow, clientIp } from "@/lib/ratelimit";
import { listWaitlist, saveWaitlist } from "@/lib/store";

export const runtime = "nodejs";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Joins the "next arrival" list. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const lang = asLang(body?.lang);
  const t = getDict(lang);
  if (!body) return NextResponse.json({ error: t.api.badRequest }, { status: 400 });
  const name = str(body.name, 60);
  const phone = str(body.phone, 30);
  const wish = str(body.wish, 300) || undefined;
  if (!name || phone.replace(/\D/g, "").length < 8) return NextResponse.json({ error: t.waitlist.required }, { status: 400 });
  if (!(await allow("waitlist", clientIp(req)))) return NextResponse.json({ error: t.waitlist.tooMany }, { status: 429 });

  // One entry per number: a second sign-up just refreshes it.
  const digits = phone.replace(/\D/g, "");
  const prev = (await listWaitlist()).find((w) => w.phone.replace(/\D/g, "") === digits);
  try {
    await saveWaitlist({ id: prev?.id ?? `w-${randomUUID().slice(0, 8)}`, createdAt: new Date().toISOString(), name, phone, wish, lang });
  } catch (e) {
    console.error("saveWaitlist failed", e);
    return NextResponse.json({ error: t.track.unavailable }, { status: 503 });
  }
  notify(req, {
    subject: `Liste d'attente : ${name}`,
    title: "Nouvelle inscription à la liste d'attente",
    actor: "Une visiteuse du site",
    rows: [["Prénom", name], ["WhatsApp", phone], ...(wish ? ([["Cherche", wish]] as [string, string][]) : [])],
    link: { label: "Lui écrire sur WhatsApp", url: waLink(phone, `Bonjour ${name}, c'est Aurahair !`) },
  });
  return NextResponse.json({ ok: true });
}

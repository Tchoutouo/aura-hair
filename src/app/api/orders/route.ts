import { NextResponse } from "next/server";
import { TEXTURES } from "@/lib/defaults";
import { newOrderId, orderText, whatsappLink } from "@/lib/order";
import { quoteCart } from "@/lib/pricing";
import { getConfig, saveOrder, type Customer } from "@/lib/store";
import { CLOSURE_SIZES, LENGTHS, type CartItem, type ClosureSize, type Config, type Mode } from "@/lib/types";

export const runtime = "nodejs";

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const isLength = (v: unknown): v is CartItem["length"] => LENGTHS.includes(v as never);
const isSize = (v: unknown) => CLOSURE_SIZES.includes(v as never);
const isQty = (v: unknown) => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 10000;

function parseItem(raw: unknown, config: Config): CartItem | null {
  if (!raw || typeof raw !== "object") return null;
  const it = raw as Record<string, unknown>;
  if (!isLength(it.length) || !isQty(it.qty)) return null;
  const qualityOk = config.qualities.some((q) => q.id === it.quality);
  const textureOk = TEXTURES.includes(it.texture as never);
  const colorOk = it.color === "natural" || it.color === "light";
  switch (it.kind) {
    case "wig":
      if (!qualityOk || !textureOk || !colorOk || !(it.closure === null || isSize(it.closure))) return null;
      return { kind: "wig", quality: it.quality as string, texture: it.texture as string, length: it.length, closure: (it.closure ?? null) as ClosureSize | null,color: it.color as "natural" | "light", qty: it.qty as number };
    case "bundle":
      if (!qualityOk || !textureOk || !colorOk) return null;
      return { kind: "bundle", quality: it.quality as string, texture: it.texture as string, length: it.length, color: it.color as "natural" | "light", qty: it.qty as number };
    case "closure":
      if (!(it.family === "single-donor" || it.family === "virgin") || !isSize(it.size)) return null;
      return { kind: "closure", family: it.family, size: it.size as never, length: it.length, qty: it.qty as number };
    default:
      return null;
  }
}

async function sendEmail(to: string, subject: string, text: string, replyTo?: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return false;
  const from = process.env.RESEND_FROM || "Aura Hair <onboarding@resend.dev>";
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#2A1E24"><pre style="font-family:inherit;white-space:pre-wrap">${text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/\*/g, "")}</pre></div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, text: text.replace(/\*/g, ""), html, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  if (!res.ok) console.error("Resend error", res.status, await res.text());
  return res.ok;
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const config = await getConfig();
  const mode: Mode = body.mode === "gros" ? "gros" : "detail";
  const rawItems = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
  const items = rawItems.map((r) => parseItem(r, config));
  if (!items.length || items.some((i) => i === null)) {
    return NextResponse.json({ error: "Panier invalide. Rechargez la page et réessayez." }, { status: 400 });
  }

  const c = (body.customer ?? {}) as Record<string, unknown>;
  const customer: Customer = {
    name: str(c.name, 100),
    phone: str(c.phone, 40),
    city: str(c.city, 100),
    email: str(c.email, 150) || undefined,
    note: str(c.note, 1000) || undefined,
  };
  if (!customer.name || !customer.phone || !customer.city) {
    return NextResponse.json({ error: "Nom, téléphone et ville sont obligatoires." }, { status: 400 });
  }
  if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) customer.email = undefined;

  // Prices are always recomputed here from the saved config, never trusted from the browser.
  const quote = quoteCart(config, mode, items as CartItem[]);
  if (!quote.ok) {
    return NextResponse.json({ error: quote.items.find((i) => !i.ok)?.error ?? "Article indisponible." }, { status: 400 });
  }

  const contact = config.contacts.find((x) => x.phone === body.contact) ?? config.contacts[0];
  const id = newOrderId();
  const text = orderText({ id, mode, customer, quote, rate: config.rateFcfaPerUsd, shippingPerKg: config.shippingFcfaPerKg });

  try {
    await saveOrder({ id, createdAt: new Date().toISOString(), mode, customer, items: items as CartItem[], quote, contact: contact.phone, rate: config.rateFcfaPerUsd });
  } catch (e) {
    console.error("saveOrder failed", e);
  }

  const subject = `Commande ${id} – ${customer.name} – ${Math.round(quote.totalFcfa).toLocaleString("fr-FR")} FCFA`;
  await Promise.allSettled([
    sendEmail(config.orderEmail, subject, text, customer.email),
    customer.email && process.env.RESEND_FROM
      ? sendEmail(customer.email, `Votre commande Aura Hair ${id}`, text.replace("Bonjour Aura Hair, je souhaite valider ma commande.", "Merci pour votre commande ! Voici son récapitulatif. Nous vous contactons sur WhatsApp pour la confirmer."))
      : Promise.resolve(false),
  ]);

  return NextResponse.json({ id, whatsapp: whatsappLink(contact.phone, text) });
}

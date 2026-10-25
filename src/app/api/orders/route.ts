import { NextResponse } from "next/server";
import { asLang, getDict } from "@/i18n";
import { TEXTURES } from "@/lib/defaults";
import { sendEmail } from "@/lib/email";
import { newOrderId, orderText, whatsappLink } from "@/lib/order";
import { quoteCart } from "@/lib/pricing";
import { allow, clientIp } from "@/lib/ratelimit";
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
      return {
        kind: "wig",
        quality: it.quality as string,
        texture: it.texture as string,
        length: it.length,
        closure: (it.closure ?? null) as ClosureSize | null,
        color: it.color as "natural" | "light",
        mounting: it.mounting !== false,
        qty: it.qty as number,
      };
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

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: getDict("fr").api.badRequest }, { status: 400 });
  }
  const lang = asLang(body.lang);
  const t = getDict(lang);

  if (!(await allow("orders", clientIp(req)))) {
    return NextResponse.json({ error: t.api.tooManyOrders }, { status: 429 });
  }

  const config = await getConfig();
  const mode: Mode = body.mode === "gros" ? "gros" : "detail";
  const rawItems = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
  const items = rawItems.map((r) => parseItem(r, config));
  if (!items.length || items.some((i) => i === null)) {
    return NextResponse.json({ error: t.api.badCart }, { status: 400 });
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
    return NextResponse.json({ error: t.api.required }, { status: 400 });
  }
  if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) customer.email = undefined;

  // Prices are always recomputed here from the saved config, never trusted from the browser.
  const quote = quoteCart(config, mode, items as CartItem[], lang);
  if (!quote.ok) {
    return NextResponse.json({ error: quote.items.find((i) => !i.ok)?.error ?? t.api.unavailable }, { status: 400 });
  }

  const contact = config.contacts.find((x) => x.phone === body.contact) ?? config.contacts[0];
  const id = newOrderId();
  const trackUrl = `${new URL(req.url).origin}/${lang}/suivi?n=${id}`;
  const text = `${orderText({ id, mode, customer, quote, rate: config.rateFcfaPerUsd, shippingPerKg: config.shippingFcfaPerKg }, lang)}\n\n${t.message.trackLine(trackUrl)}`;

  try {
    await saveOrder({ id, createdAt: new Date().toISOString(), mode, customer, items: items as CartItem[], quote, contact: contact.phone, rate: config.rateFcfaPerUsd, lang });
  } catch (e) {
    console.error("saveOrder failed", e);
  }

  const subject = `Commande ${id} – ${customer.name} – ${Math.round(quote.totalFcfa).toLocaleString("fr-FR")} FCFA`;
  // The customer copy goes to an address typed in the form: cap it per recipient so the
  // site cannot be used to mail strangers.
  const sendCopy =
    Boolean(customer.email && process.env.RESEND_FROM) &&
    (await allow("customerEmail", customer.email!.toLowerCase()));
  await Promise.allSettled([
    // Only the shop sees the exchange rate.
    sendEmail(config.orderEmail, subject, `${text}\n\n(Taux appliqué : 1 USD = ${config.rateFcfaPerUsd} FCFA)`, customer.email),
    sendCopy ? sendEmail(customer.email!, t.message.copySubject(id), text.replace(t.message.hello, t.message.thanks)) : Promise.resolve(false),
  ]);

  return NextResponse.json({ id, whatsapp: whatsappLink(contact.phone, text) });
}

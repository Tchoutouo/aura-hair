import { NextResponse } from "next/server";
import { asLang, getDict } from "@/i18n";
import { analyze, fmtDate, today } from "@/lib/gestion/compute";
import { waLink } from "@/lib/gestion/messages";
import { loadGestion, put } from "@/lib/gestion/store";
import { notify } from "@/lib/notify";
import { newRequestId, whatsappLink } from "@/lib/order";
import { fmtFcfa } from "@/lib/pricing";
import { allow, clientIp } from "@/lib/ratelimit";
import { getConfig, saveRequest } from "@/lib/store";

export const runtime = "nodejs";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Reserves a wig of the "available now" page: it leaves the page and the owners are told. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const lang = asLang(body?.lang);
  const t = getDict(lang).dispo;
  if (!body) return NextResponse.json({ error: getDict(lang).api.badRequest }, { status: 400 });
  const name = str(body.name, 80);
  const phone = str(body.phone, 30);
  const city = str(body.city, 80);
  if (!name || !city || phone.replace(/\D/g, "").length < 8) return NextResponse.json({ error: t.required }, { status: 400 });
  if (!(await allow("reserve", clientIp(req)))) return NextResponse.json({ error: t.tooMany }, { status: 429 });

  const data = await loadGestion();
  const info = analyze(data).itemInfo.get(String(body.itemId));
  if (!info || info.state !== "stock" || info.item.online === false || !info.item.price)
    return NextResponse.json({ error: t.unavailable }, { status: 409 });

  const item = info.item;
  const price = fmtFcfa(item.price!);
  await put("items", [{ ...item, status: "reserve", note: `Réservée sur le site par ${name} (${phone}, ${city}) le ${fmtDate(today())}${item.note ? `. ${item.note}` : ""}` }]);

  const config = await getConfig();
  const contact = config.contacts[0];
  const id = newRequestId();
  const text = t.message(item.label, price, name, city);
  try {
    await saveRequest({ id, createdAt: new Date().toISOString(), subject: "reservation", name, phone, message: `${item.label} à ${price}, ${city}`, contact: contact?.phone ?? "", lang });
  } catch (e) {
    console.error("saveRequest failed", e);
  }
  notify(req, {
    subject: `Réservation : ${item.label}, ${price}`,
    title: "Une perruque disponible vient d'être réservée sur le site",
    actor: "La cliente, depuis la page Disponibles",
    rows: [
      ["Perruque", item.label],
      ["Provenance", info.order?.name ?? "–"],
      ["Prix affiché", price],
      ["Cliente", name],
      ["Téléphone", phone],
      ["Ville", city],
    ],
    lines: ["Elle est passée en « Réservée » dans le stock. Si la vente ne se fait pas, remettez-la « En stock » dans la gestion pour qu'elle réapparaisse sur le site."],
    link: { label: "Écrire à la cliente sur WhatsApp", url: waLink(phone, `Bonjour ${name}, c'est Aurahair, à propos de la perruque que vous avez réservée : ${item.label}.`) },
  });
  return NextResponse.json({ ok: true, whatsapp: contact ? whatsappLink(contact.phone, text) : null });
}

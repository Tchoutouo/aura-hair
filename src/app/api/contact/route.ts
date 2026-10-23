import { NextResponse } from "next/server";
import { asLang, getDict } from "@/i18n";
import { sendEmail } from "@/lib/email";
import { newRequestId, whatsappLink } from "@/lib/order";
import { allow, clientIp } from "@/lib/ratelimit";
import { getConfig, saveRequest, type RequestSubject } from "@/lib/store";

export const runtime = "nodejs";

const SUBJECTS: RequestSubject[] = ["products", "visa", "exchange", "other"];
const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: getDict("fr").api.badRequest }, { status: 400 });
  const lang = asLang(body.lang);
  const t = getDict(lang);

  if (!(await allow("contact", clientIp(req)))) {
    return NextResponse.json({ error: t.api.tooManyRequests }, { status: 429 });
  }

  const subject = SUBJECTS.includes(body.subject as RequestSubject) ? (body.subject as RequestSubject) : "other";
  const name = str(body.name, 100);
  const phone = str(body.phone, 40);
  const message = str(body.message, 2000);
  let email = str(body.email, 150) || undefined;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) email = undefined;
  if (!name || !phone || !message) {
    return NextResponse.json({ error: t.api.contactRequired }, { status: 400 });
  }

  const config = await getConfig();
  const contact = config.contacts.find((x) => x.phone === body.contact) ?? config.contacts[0];
  const id = newRequestId();
  const c = t.contact;
  const text = [
    c.hello,
    "",
    `*${c.subjectLabel} : ${c.services[subject][0]}* (${id})`,
    `${c.name} : ${name}`,
    `${c.phone} : ${phone}`,
    ...(email ? [`E-mail : ${email}`] : []),
    "",
    message,
  ].join("\n");

  try {
    await saveRequest({ id, createdAt: new Date().toISOString(), subject, name, phone, email, message, contact: contact.phone, lang });
  } catch (e) {
    console.error("saveRequest failed", e);
  }
  await sendEmail(config.orderEmail, `Demande ${id} – ${getDict("fr").contact.services[subject][0]} – ${name}`, text, email).catch(
    (e) => console.error("contact email failed", e),
  );

  return NextResponse.json({ id, whatsapp: whatsappLink(contact.phone, text) });
}

import { NextResponse } from "next/server";
import { asLang, getDict } from "@/i18n";
import { allow, clientIp } from "@/lib/ratelimit";
import { findOrder, getConfig, getTracking, storageReady } from "@/lib/store";

export const runtime = "nodejs";

const digits = (s: string) => s.replace(/\D/g, "");

/** Public order lookup: needs the order number and the phone used for it. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const t = getDict(asLang(body?.lang)).track;
  if (!body) return NextResponse.json({ error: t.notFound }, { status: 400 });
  if (!(await allow("track", clientIp(req)))) return NextResponse.json({ error: t.unavailable }, { status: 429 });
  if (!storageReady()) return NextResponse.json({ error: t.unavailable }, { status: 503 });

  const id = String(body.id ?? "").trim().toUpperCase().slice(0, 30);
  const phone = digits(String(body.phone ?? ""));
  const order = /^AH-\d{6}-[A-Z0-9]{4}$/.test(id) && phone.length >= 6 ? await findOrder(id) : null;
  // The last 6 digits must match, whatever prefix (+237, 00237…) was typed.
  if (!order || !digits(order.customer.phone).endsWith(phone.slice(-6))) {
    return NextResponse.json({ error: t.notFound }, { status: 404 });
  }

  const [tracking, config] = await Promise.all([getTracking(order), getConfig()]);
  return NextResponse.json({
    id: order.id,
    createdAt: order.createdAt,
    items: order.quote.items.map((i) => (i.count > 1 ? `${i.count} × ${i.title}` : i.title)),
    totalFcfa: order.quote.totalFcfa,
    tracking,
    transitDays: config.transitDays,
  });
}

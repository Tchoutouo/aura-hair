import { NextResponse } from "next/server";
import { asLang, getDict } from "@/i18n";
import { newReviewId } from "@/lib/order";
import { allow, clientIp } from "@/lib/ratelimit";
import { saveReview } from "@/lib/store";

export const runtime = "nodejs";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** A customer review; it stays hidden until approved in the admin. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const lang = asLang(body?.lang);
  const t = getDict(lang);
  if (!body) return NextResponse.json({ error: t.api.badRequest }, { status: 400 });
  if (!(await allow("review", clientIp(req)))) return NextResponse.json({ error: t.reviews.tooMany }, { status: 429 });

  const name = str(body.name, 60);
  const city = str(body.city, 60);
  const text = str(body.text, 1000);
  const rating = Math.round(Number(body.rating));
  if (!name || !city || !text) return NextResponse.json({ error: t.reviews.required }, { status: 400 });

  try {
    await saveReview({
      id: newReviewId(),
      createdAt: new Date().toISOString(),
      name,
      city,
      text,
      rating: rating >= 1 && rating <= 5 ? rating : 5,
      lang,
      status: "pending",
    });
  } catch (e) {
    console.error("saveReview failed", e);
    return NextResponse.json({ error: t.track.unavailable }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}

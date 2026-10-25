import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { deleteReview, listReviews, saveReview } from "@/lib/store";

export const runtime = "nodejs";

/** Publishes or deletes a review. */
export async function PUT(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { id?: string; action?: string } | null;
  const review = (await listReviews()).find((r) => r.id === body?.id);
  if (!review) return NextResponse.json({ error: "Avis introuvable." }, { status: 404 });
  try {
    if (body?.action === "delete") await deleteReview(review.id);
    else if (body?.action === "approve") await saveReview({ ...review, status: "approved" });
    else return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Échec." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

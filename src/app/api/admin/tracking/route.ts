import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { findOrder, getTracking, saveTracking } from "@/lib/store";
import { isStep } from "@/lib/tracking";

export const runtime = "nodejs";

/** Moves an order to a step of its journey, with an optional message for the customer. */
export async function PUT(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || !isStep(body.step)) return NextResponse.json({ error: "Étape invalide." }, { status: 400 });
  const order = await findOrder(String(body.id ?? ""));
  if (!order) return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });

  const t = await getTracking(order);
  if (t.step !== body.step) {
    t.step = body.step;
    t.history = [...t.history.filter((h) => h.step !== body.step), { step: body.step, at: new Date().toISOString() }];
  }
  const note = String(body.note ?? "").trim().slice(0, 500);
  t.note = note || undefined;
  try {
    await saveTracking(order.id, t);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Échec de l'enregistrement." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, tracking: t });
}

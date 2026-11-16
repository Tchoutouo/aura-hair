import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { deleteWaitlist, listWaitlist, saveWaitlist } from "@/lib/store";

export const runtime = "nodejs";

/** Marks someone as told about the arrival, or removes them from the list. */
export async function PUT(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { id?: string; action?: string } | null;
  const entry = (await listWaitlist()).find((w) => w.id === body?.id);
  if (!entry) return NextResponse.json({ error: "Inscription introuvable." }, { status: 404 });
  if (body?.action === "delete") await deleteWaitlist(entry.id);
  else await saveWaitlist({ ...entry, notifiedAt: body?.action === "notified" ? new Date().toISOString() : undefined });
  return NextResponse.json({ ok: true, waitlist: await listWaitlist() });
}

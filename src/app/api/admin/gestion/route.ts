import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { saleTotal, today } from "@/lib/gestion/compute";
import { seedData } from "@/lib/gestion/seed";
import { invoiceKeys, loadGestion, put, remove } from "@/lib/gestion/store";
import {
  CATEGORIES,
  ITEM_STATUS,
  METHODS,
  PARTNERS,
  type Category,
  type Expense,
  type Item,
  type ItemStatus,
  type Method,
  type Movement,
  type Order,
  type Partner,
  type Payer,
  type Payment,
  type Sale,
  type Tranche,
  type Transfer,
} from "@/lib/gestion/types";

export const runtime = "nodejs";

type Body = Record<string, unknown>;

class Invalid extends Error {}
const fail = (msg: string): never => {
  throw new Invalid(msg);
};

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const opt = (v: unknown, max = 500) => str(v, max) || undefined;
const amount = (v: unknown) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
const usd = (v: unknown) => {
  const n = Math.round(Number(v) * 100) / 100;
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
const date = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : today());
const isPartner = (v: unknown): v is Partner => PARTNERS.includes(v as Partner);
const isPayer = (v: unknown): v is Payer => isPartner(v) || v === "caisse";
const newId = (prefix: string) => `${prefix}-${randomUUID().slice(0, 8)}`;

async function handle(action: string, b: Body) {
  const data = await loadGestion();
  const order = (id: unknown) => data.orders.find((o) => o.id === id);
  const item = (id: unknown) => data.items.find((i) => i.id === id);
  const soldIn = (itemId: string) => data.sales.find((s) => s.lines.some((l) => l.itemId === itemId));

  switch (action) {
    case "seed": {
      if (data.orders.length || data.items.length || data.sales.length || data.moves.length)
        fail("Des données existent déjà : l'import n'est possible que sur une gestion vide.");
      const seed = seedData(today());
      await Promise.all([put("orders", seed.orders), put("items", seed.items), put("sales", seed.sales), put("moves", seed.moves)]);
      return;
    }

    case "order.save": {
      const o = (b.order ?? {}) as Body;
      const prev = order(o.id);
      const rec: Order = {
        id: prev?.id ?? newId("cmd"),
        name: str(o.name, 80) || fail("Donnez un nom à la commande."),
        date: date(o.date),
        supplier: str(o.supplier, 80),
        rate: amount(o.rate) || fail("Indiquez le taux du dollar de la commande."),
        discountUsd: usd(o.discountUsd),
        settled: o.settled === true,
        note: opt(o.note),
        createdAt: prev?.createdAt ?? new Date().toISOString(),
      };
      await put("orders", [rec]);
      return { id: rec.id };
    }

    case "order.delete": {
      const o = order(b.id) ?? fail("Commande introuvable.");
      const its = data.items.filter((i) => i.orderId === o.id);
      if (its.some((i) => soldIn(i.id))) fail("Des articles de cette commande sont vendus : supprimez d'abord ces ventes.");
      const linked = data.moves.filter((m) => m.kind === "expense" && (m.orderId === o.id || its.some((i) => i.id === m.itemId)));
      if (linked.length) fail("Des dépenses sont liées à cette commande : supprimez-les d'abord dans Caisse et dépenses.");
      await Promise.all([remove("orders", [o.id]), remove("items", its.map((i) => i.id))]);
      return;
    }

    case "items.add": {
      const o = order(b.orderId) ?? fail("Commande introuvable.");
      const rows = Array.isArray(b.items) ? (b.items as Body[]).slice(0, 100) : [];
      const taken = new Set(data.items.map((i) => i.id));
      let n = data.items.filter((i) => i.orderId === o.id).length;
      const recs: Item[] = rows
        .filter((r) => str(r.label))
        .map((r) => {
          let id = "";
          do id = `${o.id}-${String(++n).padStart(2, "0")}`;
          while (taken.has(id));
          taken.add(id);
          const price = amount(r.price);
          const minPrice = amount(r.minPrice);
          return { id, orderId: o.id, label: str(r.label, 160), costUsd: usd(r.costUsd), ...(price ? { price } : {}), ...(minPrice ? { minPrice } : {}), status: "stock" };
        });
      if (!recs.length) fail("Ajoutez au moins un article avec une description.");
      await put("items", recs);
      return;
    }

    case "item.save": {
      const i = (b.item ?? {}) as Body;
      const prev = item(i.id) ?? fail("Article introuvable.");
      const price = amount(i.price);
      const minPrice = amount(i.minPrice);
      const rec: Item = {
        id: prev.id,
        orderId: order(i.orderId)?.id ?? prev.orderId,
        label: str(i.label, 160) || prev.label,
        costUsd: usd(i.costUsd),
        ...(price ? { price } : {}),
        ...(minPrice ? { minPrice } : {}),
        status: (Object.keys(ITEM_STATUS) as ItemStatus[]).includes(i.status as ItemStatus) ? (i.status as ItemStatus) : "stock",
        note: opt(i.note),
      };
      await put("items", [rec]);
      return;
    }

    case "item.delete": {
      const i = item(b.id) ?? fail("Article introuvable.");
      if (soldIn(i.id)) fail("Cet article est vendu : supprimez d'abord la vente.");
      if (data.moves.some((m) => m.kind === "expense" && m.itemId === i.id)) fail("Des dépenses sont liées à cet article.");
      await remove("items", [i.id]);
      return;
    }

    case "sale.save": {
      const s = (b.sale ?? {}) as Body;
      const prev = data.sales.find((x) => x.id === s.id);
      const lines = (Array.isArray(s.lines) ? (s.lines as Body[]) : []).map((l) => {
        const it = item(l.itemId) ?? fail("Un article de la vente n'existe plus.");
        const other = soldIn(it.id);
        if (other && other.id !== prev?.id) fail(`« ${it.label} » est déjà dans une autre vente.`);
        return { itemId: it.id, price: amount(l.price) };
      });
      if (!lines.length) fail("Choisissez au moins un article.");
      if (new Set(lines.map((l) => l.itemId)).size !== lines.length) fail("Un article est en double dans la vente.");
      const c = (s.customer ?? {}) as Body;
      const rec: Sale = {
        id: prev?.id ?? newId("v"),
        number: prev?.number ?? Math.max(0, ...data.sales.map((x) => x.number)) + 1,
        date: date(s.date),
        customer: { name: str(c.name, 80) || fail("Indiquez le nom de la cliente."), phone: str(c.phone, 30) },
        lines,
        discount: amount(s.discount),
        ...(amount(s.rate) ? { rate: amount(s.rate) } : {}),
        schedule: [],
        note: opt(s.note),
        reminders: prev?.reminders ?? [],
        createdAt: prev?.createdAt ?? new Date().toISOString(),
      };
      const total = saleTotal(rec);
      if (total < 0) fail("La remise dépasse le prix des articles.");
      const tranches: Tranche[] = (Array.isArray(s.schedule) ? (s.schedule as Body[]) : [])
        .map((t) => ({ date: date(t.date), amount: amount(t.amount) }))
        .filter((t) => t.amount > 0)
        .sort((x, y) => x.date.localeCompare(y.date));
      if (tranches.length) {
        // The schedule always adds up to the total: the last tranche absorbs any difference.
        const gap = total - tranches.reduce((sum, t) => sum + t.amount, 0);
        const last = tranches[tranches.length - 1];
        last.amount = Math.max(0, last.amount + gap);
        rec.schedule = tranches.filter((t) => t.amount > 0);
      }
      const moves: Movement[] = [];
      const p = (b.payment ?? null) as Body | null;
      if (p && amount(p.amount) > 0) {
        if (!isPartner(p.receivedBy)) fail("Indiquez qui a reçu l'argent.");
        moves.push({
          id: newId("p"),
          kind: "payment",
          date: date(p.date ?? rec.date),
          saleId: rec.id,
          amount: amount(p.amount),
          method: (p.method as Method) in METHODS ? (p.method as Method) : "autre",
          receivedBy: p.receivedBy as Partner,
        });
      }
      await Promise.all([put("sales", [rec]), put("moves", moves)]);
      return { id: rec.id };
    }

    case "sale.delete": {
      const s = data.sales.find((x) => x.id === b.id) ?? fail("Vente introuvable.");
      const pays = data.moves.filter((m) => m.kind === "payment" && m.saleId === s.id).map((m) => m.id);
      await Promise.all([remove("sales", [s.id]), remove("moves", pays)]);
      return;
    }

    case "sale.remind": {
      const s = data.sales.find((x) => x.id === b.id) ?? fail("Vente introuvable.");
      await put("sales", [{ ...s, reminders: [...s.reminders, new Date().toISOString()].slice(-20) }]);
      return;
    }

    case "move.save": {
      const m = (b.move ?? {}) as Body;
      const prev = data.moves.find((x) => x.id === m.id);
      const id = prev?.id ?? newId(m.kind === "payment" ? "p" : m.kind === "expense" ? "e" : "t");
      const base = { id, date: date(m.date), amount: amount(m.amount) || fail("Indiquez un montant."), note: opt(m.note) };
      let rec: Movement;
      if (m.kind === "payment") {
        const sale = data.sales.find((x) => x.id === m.saleId) ?? fail("Vente introuvable.");
        if (!isPartner(m.receivedBy)) fail("Indiquez qui a reçu l'argent.");
        rec = {
          ...base,
          kind: "payment",
          saleId: sale.id,
          method: (m.method as Method) in METHODS ? (m.method as Method) : "autre",
          receivedBy: m.receivedBy as Partner,
        } satisfies Payment;
      } else if (m.kind === "expense") {
        if (!isPayer(m.paidBy)) fail("Indiquez qui a payé.");
        const it = m.itemId ? item(m.itemId) ?? fail("Article introuvable.") : undefined;
        const o = it ? order(it.orderId) : m.orderId ? order(m.orderId) ?? fail("Commande introuvable.") : undefined;
        rec = {
          ...base,
          kind: "expense",
          category: (m.category as Category) in CATEGORIES ? (m.category as Category) : "autre",
          label: str(m.label, 160) || fail("Décrivez la dépense."),
          paidBy: m.paidBy as Payer,
          ...(m.paidBy === "caisse" && isPartner(m.via) ? { via: m.via } : {}),
          ...(o ? { orderId: o.id } : {}),
          ...(it ? { itemId: it.id } : {}),
        } satisfies Expense;
      } else if (m.kind === "transfer") {
        if (!isPayer(m.from) || !isPayer(m.to) || m.from === m.to) fail("Choisissez qui donne et qui reçoit (deux différents).");
        rec = {
          ...base,
          kind: "transfer",
          from: m.from as Payer,
          to: m.to as Payer,
          label: opt(m.label, 160),
          ...((m.from === "caisse" || m.to === "caisse") && isPartner(m.via) ? { via: m.via } : {}),
        } satisfies Transfer;
      } else return fail("Type de mouvement inconnu.");
      await put("moves", [rec]);
      return;
    }

    case "move.delete": {
      const m = data.moves.find((x) => x.id === b.id) ?? fail("Mouvement introuvable.");
      await remove("moves", [m.id]);
      return;
    }

    default:
      fail("Action inconnue.");
  }
}

/** All management changes; answers with the fresh data so both partners always see the same numbers. */
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body || typeof body.action !== "string") return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  try {
    const result = await handle(body.action, body);
    const data = await loadGestion();
    return NextResponse.json({ ok: true, ...(result ?? {}), data, keys: invoiceKeys(data) });
  } catch (e) {
    if (e instanceof Invalid) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("gestion", body.action, e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur." }, { status: 500 });
  }
}

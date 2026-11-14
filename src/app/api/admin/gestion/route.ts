import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { analyze, returnNumber, saleTotal, today } from "@/lib/gestion/compute";
import { seedData } from "@/lib/gestion/seed";
import { invoiceKeys, loadGestion, put, remove } from "@/lib/gestion/store";
import {
  CATEGORIES,
  ITEM_STATUS,
  METHODS,
  PARTNERS,
  RETURN_OUTCOMES,
  RETURN_SOLUTIONS,
  SUPPLIER_CLAIMS,
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
  type Return,
  type ReturnOutcome,
  type ReturnSolution,
  type Sale,
  type SupplierClaim,
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
const pick = <T extends string>(v: unknown, options: Record<T, string>): T | undefined =>
  typeof v === "string" && v in options ? (v as T) : undefined;

/** Status of a defective article according to what is decided for it. */
const statusFor = (o: ReturnOutcome): ItemStatus => (o === "stock" ? "stock" : o === "perte" ? "retire" : "sav");

async function handle(action: string, b: Body) {
  const data = await loadGestion();
  const order = (id: unknown) => data.orders.find((o) => o.id === id);
  const item = (id: unknown) => data.items.find((i) => i.id === id);
  // Sale where the article is currently sold (returned lines no longer count).
  const soldIn = (itemId: string) => data.sales.find((s) => s.lines.some((l) => l.itemId === itemId && !l.returned));
  // Any trace of the article in sales or returns: it cannot be deleted then.
  const used = (itemId: string) =>
    data.sales.some((s) => s.lines.some((l) => l.itemId === itemId)) ||
    data.returns.some((r) => r.itemId === itemId || r.replacementItemId === itemId);
  const ret = (id: unknown) => data.returns.find((r) => r.id === id) ?? fail("Retour introuvable.");

  switch (action) {
    case "seed": {
      if (data.orders.length || data.items.length || data.sales.length || data.moves.length || data.returns.length)
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
      if (its.some((i) => used(i.id))) fail("Des articles de cette commande sont dans des ventes ou des retours : supprimez-les d'abord.");
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
      if (used(i.id)) fail("Cet article apparaît dans une vente ou un retour : supprimez-les d'abord.");
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
      // Returned lines are history from the Retours tab: they are kept as they are.
      const returnedLines = prev?.lines.filter((l) => l.returned) ?? [];
      const c = (s.customer ?? {}) as Body;
      const rec: Sale = {
        id: prev?.id ?? newId("v"),
        number: prev?.number ?? Math.max(0, ...data.sales.map((x) => x.number)) + 1,
        date: date(s.date),
        customer: { name: str(c.name, 80) || fail("Indiquez le nom de la cliente."), phone: str(c.phone, 30) },
        lines: [...lines, ...returnedLines],
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
      if (data.returns.some((r) => r.saleId === s.id)) fail("Un retour est lié à cette vente : supprimez d'abord le retour.");
      if (data.moves.some((m) => m.kind === "payment" && m.saleId === s.id && m.method === "avoir"))
        fail("Un avoir a été utilisé sur cette vente : supprimez d'abord ce mouvement dans Caisse et dépenses.");
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
      if (prev && "returnId" in prev && prev.returnId) fail("Ce mouvement vient d'un retour : gérez-le depuis l'onglet Retours.");
      if (prev?.kind === "payment" && prev.method === "avoir") fail("Un avoir ne se modifie pas : supprimez-le puis recommencez.");
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
      if ("returnId" in m && m.returnId) fail("Ce mouvement vient d'un retour : gérez-le depuis l'onglet Retours.");
      // A credit moved between two sales is removed with its other half.
      const pair = m.kind === "payment" && m.pairId ? data.moves.filter((x) => x.kind === "payment" && x.pairId === m.pairId).map((x) => x.id) : [];
      await remove("moves", [m.id, ...pair]);
      return;
    }

    case "return.create": {
      const r = (b.ret ?? {}) as Body;
      const it = item(r.itemId) ?? fail("Choisissez l'article défectueux.");
      const origin = r.origin === "cliente" ? "cliente" : "stock";
      const id = newId("r");
      const number = Math.max(0, ...data.returns.map((x) => x.number)) + 1;
      const when = date(r.date);
      const label = `${returnNumber({ number })}, ${it.label}`;
      const effects: Return["effects"] = { prevItemStatus: it.status };
      const sales: Sale[] = [];
      const items: Item[] = [];
      const moves: Movement[] = [];
      let solution: ReturnSolution | undefined;
      let replacementItemId: string | undefined;
      let outcome: ReturnOutcome;
      const sale = soldIn(it.id);

      if (origin === "cliente") {
        if (!sale) fail("Cet article n'est dans aucune vente : choisissez « Défaut constaté en stock ».");
        solution = pick(r.solution, RETURN_SOLUTIONS) ?? fail("Choisissez ce que vous proposez à la cliente.");
        const lines = sale!.lines.map((l) => ({ ...l }));
        const line = lines.find((l) => l.itemId === it.id && !l.returned)!;
        if (solution === "echange") {
          const rep = item(r.replacementItemId) ?? fail("Choisissez l'article donné en échange.");
          if (rep.id === it.id || soldIn(rep.id) || (rep.status !== "stock" && rep.status !== "reserve"))
            fail("L'article donné en échange n'est pas disponible.");
          line.itemId = rep.id;
          replacementItemId = rep.id;
          effects.prevReplacementStatus = rep.status;
        } else if (solution === "avoir" || solution === "remboursement") {
          line.returned = true;
          effects.lineReturned = true;
          if (solution === "remboursement") {
            const f = (b.refund ?? {}) as Body;
            const amt = amount(f.amount) || fail("Indiquez le montant remboursé.");
            if (!isPartner(f.receivedBy)) fail("Indiquez qui a remboursé la cliente.");
            moves.push({
              id: newId("p"),
              kind: "payment",
              date: date(f.date ?? when),
              saleId: sale!.id,
              amount: -amt,
              method: pick(f.method, METHODS) ?? "momo",
              receivedBy: f.receivedBy as Partner,
              returnId: id,
              note: `Remboursement, retour ${returnNumber({ number })}`,
            });
          }
        }
        sales.push({ ...sale!, lines });
        outcome = solution === "reparation" || solution === "aucune" ? "cliente" : pick(r.outcome, RETURN_OUTCOMES) ?? "attente";
        if (outcome === "cliente" && solution !== "reparation" && solution !== "aucune") outcome = "attente";
      } else {
        if (sale) fail("Cet article est vendu : choisissez « Retour d'une cliente ».");
        outcome = pick(r.outcome, RETURN_OUTCOMES) ?? "attente";
        if (outcome === "cliente") outcome = "attente";
      }

      const repair = (b.repair ?? null) as Body | null;
      if (repair && amount(repair.amount) > 0) {
        if (!isPayer(repair.paidBy)) fail("Indiquez qui a payé la réparation.");
        moves.push({
          id: newId("e"),
          kind: "expense",
          date: date(repair.date ?? when),
          category: "reparation",
          label: `Réparation ${label}`,
          amount: amount(repair.amount),
          paidBy: repair.paidBy as Payer,
          ...(repair.paidBy === "caisse" && isPartner(repair.via) ? { via: repair.via } : {}),
          orderId: it.orderId,
          itemId: it.id,
          returnId: id,
        });
      }
      if (outcome !== "cliente") items.push({ ...it, status: statusFor(outcome) });

      const rec: Return = {
        id,
        number,
        date: when,
        itemId: it.id,
        origin,
        ...(sale && origin === "cliente" ? { saleId: sale.id } : {}),
        problem: str(r.problem, 1000) || fail("Décrivez le défaut."),
        ...(solution ? { solution } : {}),
        ...(replacementItemId ? { replacementItemId } : {}),
        outcome,
        claim: pick(r.claim, SUPPLIER_CLAIMS) ?? "aucune",
        closed: false,
        note: opt(r.note),
        effects,
        createdAt: new Date().toISOString(),
      };
      await Promise.all([put("returns", [rec]), put("sales", sales), put("items", items), put("moves", moves)]);
      return { id };
    }

    case "return.update": {
      const r = ret(b.id);
      const keepsIt = r.solution === "reparation" || r.solution === "aucune";
      let outcome = keepsIt ? "cliente" : pick(b.outcome, RETURN_OUTCOMES) ?? r.outcome;
      if (outcome === "cliente" && !keepsIt) outcome = r.outcome;
      const rec: Return = {
        ...r,
        problem: str(b.problem, 1000) || r.problem,
        outcome,
        claim: pick<SupplierClaim>(b.claim, SUPPLIER_CLAIMS) ?? r.claim,
        closed: b.closed === true,
        note: opt(b.note),
      };
      const it = item(r.itemId);
      const items = it && outcome !== "cliente" && !soldIn(it.id) ? [{ ...it, status: statusFor(outcome) }] : [];
      await Promise.all([put("returns", [rec]), put("items", items)]);
      return;
    }

    case "return.money": {
      // Money arriving after the return was opened: a repair paid, or a refund from the supplier.
      const r = ret(b.id);
      const it = item(r.itemId) ?? fail("Article introuvable.");
      const amt = amount(b.amount) || fail("Indiquez un montant.");
      if (!isPayer(b.who)) fail("Indiquez qui a payé ou reçu l'argent.");
      const supplier = b.type === "fournisseur";
      const move: Expense = {
        id: newId("e"),
        kind: "expense",
        date: date(b.date),
        category: supplier ? "fournisseur" : "reparation",
        label: `${supplier ? "Remboursement du fournisseur" : "Réparation"} ${returnNumber(r)}, ${it.label}`,
        // A supplier refund is money coming back: it lowers the article's cost.
        amount: supplier ? -amt : amt,
        paidBy: b.who as Payer,
        ...(b.who === "caisse" && isPartner(b.via) ? { via: b.via } : {}),
        orderId: it.orderId,
        itemId: it.id,
        returnId: r.id,
      };
      const updates = supplier && r.claim !== "acceptee" ? [{ ...r, claim: "acceptee" as SupplierClaim }] : [];
      await Promise.all([put("moves", [move]), put("returns", updates)]);
      return;
    }

    case "return.moneyDelete": {
      const r = ret(b.id);
      const m = data.moves.find((x) => x.id === b.moveId && "returnId" in x && x.returnId === r.id) ?? fail("Mouvement introuvable.");
      await remove("moves", [m.id]);
      return;
    }

    case "return.delete": {
      // Puts back what the return changed: the sale line, the exchanged article, the statuses.
      const r = ret(b.id);
      const sales: Sale[] = [];
      const items: Item[] = [];
      const sale = r.saleId ? data.sales.find((s) => s.id === r.saleId) : undefined;
      if (r.effects.lineReturned && data.moves.some((m) => m.kind === "payment" && m.saleId === r.saleId && m.amount < 0 && m.returnId !== r.id))
        fail("L'avoir de ce retour a déjà été utilisé ou remboursé : supprimez d'abord ce mouvement dans Caisse et dépenses.");
      if (sale && (r.effects.lineReturned || r.replacementItemId)) {
        const other = soldIn(r.itemId);
        if (other) fail("L'article défectueux a été revendu depuis : ce retour ne peut plus être annulé.");
        sales.push({
          ...sale,
          lines: sale.lines.map((l) =>
            r.effects.lineReturned && l.itemId === r.itemId && l.returned
              ? { itemId: l.itemId, price: l.price }
              : r.replacementItemId && l.itemId === r.replacementItemId && !l.returned
                ? { ...l, itemId: r.itemId }
                : l,
          ),
        });
      }
      const it = item(r.itemId);
      if (it) items.push({ ...it, status: r.effects.prevItemStatus });
      const rep = r.replacementItemId ? item(r.replacementItemId) : undefined;
      if (rep) items.push({ ...rep, status: r.effects.prevReplacementStatus ?? "stock" });
      const moves = data.moves.filter((m) => "returnId" in m && m.returnId === r.id).map((m) => m.id);
      await Promise.all([put("sales", sales), put("items", items), remove("moves", moves), remove("returns", [r.id])]);
      return;
    }

    case "credit.use": {
      // Moves a customer's credit (overpayment after a return) onto another sale. No real money moves.
      const a = analyze(data);
      const from = a.saleInfo.get(String(b.fromSaleId)) ?? fail("Vente d'origine introuvable.");
      const to = a.saleInfo.get(String(b.toSaleId)) ?? fail("Choisissez la vente à régler avec l'avoir.");
      if (from.sale.id === to.sale.id) fail("Choisissez une autre vente.");
      const amt = amount(b.amount) || fail("Indiquez un montant.");
      if (amt > from.credit) fail(`L'avoir disponible est de ${from.credit} F.`);
      if (amt > Math.max(0, to.remaining)) fail("Le montant dépasse ce qui reste à payer sur cette vente.");
      const who = isPartner(b.by) ? (b.by as Partner) : "yvaltt";
      const pairId = newId("av");
      const when = date(b.date);
      await put("moves", [
        { id: newId("p"), kind: "payment", date: when, saleId: from.sale.id, amount: -amt, method: "avoir", receivedBy: who, pairId, note: "Avoir utilisé sur une autre vente" },
        { id: newId("p"), kind: "payment", date: when, saleId: to.sale.id, amount: amt, method: "avoir", receivedBy: who, pairId, note: "Réglé avec un avoir" },
      ] satisfies Payment[]);
      return;
    }

    case "credit.refund": {
      const a = analyze(data);
      const s = a.saleInfo.get(String(b.saleId)) ?? fail("Vente introuvable.");
      const amt = amount(b.amount) || fail("Indiquez un montant.");
      if (amt > s.credit) fail(`L'avoir disponible est de ${s.credit} F.`);
      if (!isPartner(b.by)) fail("Indiquez qui a remboursé la cliente.");
      await put("moves", [
        { id: newId("p"), kind: "payment", date: date(b.date), saleId: s.sale.id, amount: -amt, method: pick(b.method, METHODS) ?? "momo", receivedBy: b.by as Partner, note: "Avoir remboursé" },
      ] satisfies Payment[]);
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

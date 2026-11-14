import {
  PARTNERS,
  type Expense,
  type GestionData,
  type Item,
  type Order,
  type Partner,
  type Payment,
  type Sale,
  type Tranche,
  type Transfer,
} from "./types";

/** Today in Cameroon, as YYYY-MM-DD. */
export function today(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Douala" }).format(now);
}

export const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export const fmtDate = (date: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${date}T12:00:00Z`),
  );

export const invoiceNumber = (s: Pick<Sale, "number" | "date">) => `F${s.date.slice(0, 4)}-${String(s.number).padStart(3, "0")}`;

export const saleTotal = (s: Pick<Sale, "lines" | "discount">) =>
  s.lines.reduce((sum, l) => sum + l.price, 0) - (s.discount || 0);

/** Schedule actually used: no tranches means everything is due on the sale date. */
export const effectiveSchedule = (s: Sale): Tranche[] =>
  s.schedule.length ? [...s.schedule].sort((a, b) => a.date.localeCompare(b.date)) : [{ date: s.date, amount: saleTotal(s) }];

export type SaleStatus = "payee" | "retard" | "partielle" | "attente";
export const SALE_STATUS: Record<SaleStatus, string> = {
  payee: "Payée",
  retard: "En retard",
  partielle: "Paiement partiel",
  attente: "En attente de paiement",
};

export interface SaleInfo {
  sale: Sale;
  total: number;
  paid: number;
  remaining: number;
  /** Amount that should already have been paid and was not */
  overdue: number;
  /** Next tranche not yet covered, with what is left to pay on it */
  next?: Tranche;
  status: SaleStatus;
  payments: Payment[];
  cost: number;
  margin: number;
}

export type ItemState = "stock" | "reserve" | "retire" | "vendu" | "vendu_encours";
export const ITEM_STATE: Record<ItemState, string> = {
  stock: "En stock",
  reserve: "Réservée",
  retire: "Retirée",
  vendu: "Vendue (payée)",
  vendu_encours: "Vendue (paiement en cours)",
};

export interface ItemInfo {
  item: Item;
  order?: Order;
  /** Purchase cost in FCFA: share of the order's cost + costs paid for this article */
  cost: number;
  state: ItemState;
  sale?: Sale;
  soldPrice?: number;
}

export interface OrderInfo {
  order: Order;
  items: Item[];
  itemsUsd: number;
  /** (articles − discount) × rate */
  estimatedSupplier: number;
  supplierPaid: number;
  /** Supplier part of the cost (what was paid when settled, else the larger of paid and estimate) */
  supplierCost: number;
  /** Transport, fees… linked to the order */
  otherCosts: number;
  total: number;
  /** Still to pay the supplier, while the order is not settled */
  supplierDue: number;
  expenses: Expense[];
  sold: number;
  revenue: number;
  received: number;
  /** Revenue − cost of the sold articles */
  margin: number;
  stockCost: number;
}

export interface PartnerInfo {
  /** Expenses paid personally */
  apports: number;
  /** Money put into the caisse */
  deposits: number;
  /** Money taken out of the caisse */
  withdrawals: number;
  /** Paid to / received from the other partner */
  givenToPartner: number;
  receivedFromPartner: number;
  /** Net personal contribution */
  net: number;
  /** Business money (sales) physically received by this partner, for information */
  collected: number;
}

const r = Math.round;

export function analyze(data: GestionData, on = today()) {
  const orderById = new Map(data.orders.map((o) => [o.id, o]));
  const itemById = new Map(data.items.map((i) => [i.id, i]));
  const payments = data.moves.filter((m): m is Payment => m.kind === "payment");
  const expenses = data.moves.filter((m): m is Expense => m.kind === "expense");
  const transfers = data.moves.filter((m): m is Transfer => m.kind === "transfer");

  // Expense attached to an article counts for that article's order too.
  const orderOf = (e: Expense) => e.orderId ?? (e.itemId ? itemById.get(e.itemId)?.orderId : undefined);

  // --- Cost of each order and of each article
  const itemCost = new Map<string, number>();
  const orderBase = new Map<string, Omit<OrderInfo, "sold" | "revenue" | "received" | "margin" | "stockCost">>();
  for (const order of data.orders) {
    const items = data.items.filter((i) => i.orderId === order.id);
    const linked = expenses.filter((e) => orderOf(e) === order.id);
    const itemsUsd = items.reduce((s, i) => s + i.costUsd, 0);
    const estimatedSupplier = r(Math.max(0, itemsUsd - order.discountUsd) * order.rate);
    const supplierPaid = linked.filter((e) => e.category === "fournisseur").reduce((s, e) => s + e.amount, 0);
    const supplierCost = order.settled ? supplierPaid : Math.max(supplierPaid, estimatedSupplier);
    const pooled = linked.filter((e) => e.category !== "fournisseur" && !e.itemId).reduce((s, e) => s + e.amount, 0);
    const perItem = linked.filter((e) => e.itemId).reduce((s, e) => s + e.amount, 0);
    const pool = supplierCost + pooled;
    for (const it of items) {
      const weight = itemsUsd > 0 ? it.costUsd / itemsUsd : 1 / items.length;
      const own = linked.filter((e) => e.itemId === it.id).reduce((s, e) => s + e.amount, 0);
      itemCost.set(it.id, r(pool * weight) + own);
    }
    orderBase.set(order.id, {
      order,
      items,
      itemsUsd,
      estimatedSupplier,
      supplierPaid,
      supplierCost,
      otherCosts: pooled + perItem,
      total: pool + perItem,
      supplierDue: order.settled ? 0 : Math.max(0, estimatedSupplier - supplierPaid),
      expenses: linked,
    });
  }

  // --- Sales
  const saleInfo = new Map<string, SaleInfo>();
  const itemSale = new Map<string, { sale: Sale; price: number }>();
  for (const sale of data.sales) {
    const total = saleTotal(sale);
    const pays = payments.filter((p) => p.saleId === sale.id).sort((a, b) => a.date.localeCompare(b.date));
    const paid = pays.reduce((s, p) => s + p.amount, 0);
    const sched = effectiveSchedule(sale);
    const dueByNow = Math.min(
      total,
      sched.filter((t) => t.date <= on).reduce((s, t) => s + t.amount, 0),
    );
    let cum = 0;
    let next: Tranche | undefined;
    for (const t of sched) {
      cum += t.amount;
      if (cum > paid) {
        next = { date: t.date, amount: Math.min(t.amount, cum - paid) };
        break;
      }
    }
    const remaining = total - paid;
    const overdue = Math.max(0, dueByNow - paid);
    const status: SaleStatus = remaining <= 0 ? "payee" : overdue > 0 ? "retard" : paid > 0 ? "partielle" : "attente";
    const cost = sale.lines.reduce((s, l) => s + (itemCost.get(l.itemId) ?? 0), 0);
    for (const l of sale.lines) itemSale.set(l.itemId, { sale, price: l.price });
    saleInfo.set(sale.id, {
      sale,
      total,
      paid,
      remaining,
      overdue,
      next: remaining > 0 ? next : undefined,
      status,
      payments: pays,
      cost,
      margin: total - cost,
    });
  }

  // --- Articles
  const itemInfo = new Map<string, ItemInfo>();
  for (const item of data.items) {
    const sold = itemSale.get(item.id);
    const state: ItemState = sold
      ? saleInfo.get(sold.sale.id)?.status === "payee"
        ? "vendu"
        : "vendu_encours"
      : item.status;
    itemInfo.set(item.id, {
      item,
      order: orderById.get(item.orderId),
      cost: itemCost.get(item.id) ?? 0,
      state,
      sale: sold?.sale,
      soldPrice: sold?.price,
    });
  }

  // --- Orders: what their articles brought in
  const orderInfo = new Map<string, OrderInfo>();
  for (const [id, base] of orderBase) {
    let sold = 0;
    let revenue = 0;
    let received = 0;
    let soldCost = 0;
    let stockCost = 0;
    for (const it of base.items) {
      const info = itemInfo.get(it.id)!;
      if (info.sale) {
        const si = saleInfo.get(info.sale.id)!;
        sold++;
        // A sale's discount and payments are spread over its lines by price.
        const share = si.total + (info.sale.discount || 0) > 0 ? (info.soldPrice ?? 0) / (si.total + (info.sale.discount || 0)) : 0;
        revenue += r(si.total * share);
        received += r(si.paid * share);
        soldCost += info.cost;
      } else if (info.state !== "retire") stockCost += info.cost;
    }
    orderInfo.set(id, { ...base, sold, revenue, received, margin: revenue - soldCost, stockCost });
  }

  // --- Partners and caisse
  const partners = Object.fromEntries(
    PARTNERS.map((p) => {
      const apports = expenses.filter((e) => e.paidBy === p).reduce((s, e) => s + e.amount, 0);
      const deposits = transfers.filter((t) => t.from === p && t.to === "caisse").reduce((s, t) => s + t.amount, 0);
      const withdrawals = transfers.filter((t) => t.from === "caisse" && t.to === p).reduce((s, t) => s + t.amount, 0);
      const givenToPartner = transfers.filter((t) => t.from === p && t.to !== "caisse" && t.to !== p).reduce((s, t) => s + t.amount, 0);
      const receivedFromPartner = transfers.filter((t) => t.to === p && t.from !== "caisse" && t.from !== p).reduce((s, t) => s + t.amount, 0);
      const collected = payments.filter((x) => x.receivedBy === p).reduce((s, x) => s + x.amount, 0);
      const net = apports + deposits - withdrawals + givenToPartner - receivedFromPartner;
      return [p, { apports, deposits, withdrawals, givenToPartner, receivedFromPartner, net, collected } satisfies PartnerInfo];
    }),
  ) as Record<Partner, PartnerInfo>;

  // Both own half of everything: whoever put in more personally is owed half the difference.
  const diff = partners.yvaltt.net - partners.lisa.net;
  const settlement =
    Math.abs(diff) >= 2
      ? diff > 0
        ? { from: "lisa" as Partner, to: "yvaltt" as Partner, amount: r(diff / 2) }
        : { from: "yvaltt" as Partner, to: "lisa" as Partner, amount: r(-diff / 2) }
      : null;

  const caisseIn =
    payments.reduce((s, p) => s + p.amount, 0) + transfers.filter((t) => t.to === "caisse").reduce((s, t) => s + t.amount, 0);
  const caisseOut =
    expenses.filter((e) => e.paidBy === "caisse").reduce((s, e) => s + e.amount, 0) +
    transfers.filter((t) => t.from === "caisse").reduce((s, t) => s + t.amount, 0);
  // Where the caisse money physically is.
  const holdings: Record<Partner | "inconnu", number> = { yvaltt: 0, lisa: 0, inconnu: 0 };
  for (const p of payments) holdings[p.receivedBy] += p.amount;
  for (const e of expenses) if (e.paidBy === "caisse") holdings[e.via ?? "inconnu"] -= e.amount;
  for (const t of transfers) {
    if (t.to === "caisse") holdings[t.via ?? (t.from === "caisse" ? "inconnu" : t.from)] += t.amount;
    if (t.from === "caisse") holdings[t.via ?? (t.to === "caisse" ? "inconnu" : t.to)] -= t.amount;
  }

  // --- Totals
  const sales = [...saleInfo.values()];
  const items = [...itemInfo.values()];
  const invested = expenses.reduce((s, e) => s + e.amount, 0);
  const general = expenses.filter((e) => !orderOf(e)).reduce((s, e) => s + e.amount, 0);
  const revenue = sales.reduce((s, x) => s + x.total, 0);
  const received = payments.reduce((s, p) => s + p.amount, 0);
  const cogs = sales.reduce((s, x) => s + x.cost, 0);
  const inStock = items.filter((i) => i.state === "stock" || i.state === "reserve");
  const totals = {
    invested,
    investedOrders: invested - general,
    general,
    revenue,
    received,
    receivable: sales.reduce((s, x) => s + Math.max(0, x.remaining), 0),
    overdue: sales.reduce((s, x) => s + x.overdue, 0),
    cogs,
    grossMargin: revenue - cogs,
    netProfit: revenue - cogs - general,
    soldCount: items.filter((i) => i.sale).length,
    stockCount: inStock.length,
    stockCost: inStock.reduce((s, i) => s + i.cost, 0),
    stockValue: inStock.reduce((s, i) => s + (i.item.price ?? 0), 0),
    stockUnpriced: inStock.filter((i) => !i.item.price).length,
    cash: received - invested,
    recovered: invested > 0 ? received / invested : 0,
    caisse: caisseIn - caisseOut,
  };

  // --- Money in / out per month (internal transfers excluded)
  const months = new Map<string, { month: string; in: number; out: number }>();
  const bump = (date: string, key: "in" | "out", amount: number) => {
    const m = date.slice(0, 7);
    const row = months.get(m) ?? { month: m, in: 0, out: 0 };
    row[key] += amount;
    months.set(m, row);
  };
  for (const p of payments) bump(p.date, "in", p.amount);
  for (const e of expenses) bump(e.date, "out", e.amount);
  const monthly = [...months.values()].sort((a, b) => a.month.localeCompare(b.month));

  // --- What customers still owe
  const dues = sales
    .filter((s) => s.remaining > 0)
    .sort((a, b) => (a.next?.date ?? "").localeCompare(b.next?.date ?? ""));

  const customers = new Map<string, { name: string; phone: string; count: number; total: number; remaining: number }>();
  for (const s of sales) {
    const key = s.sale.customer.phone.replace(/\D/g, "") || s.sale.customer.name.toLowerCase();
    const c = customers.get(key) ?? { name: s.sale.customer.name, phone: s.sale.customer.phone, count: 0, total: 0, remaining: 0 };
    c.count += s.sale.lines.length;
    c.total += s.total;
    c.remaining += Math.max(0, s.remaining);
    customers.set(key, c);
  }

  return {
    on,
    orderInfo,
    itemInfo,
    saleInfo,
    partners,
    settlement,
    holdings,
    totals,
    monthly,
    dues,
    customers: [...customers.values()].sort((a, b) => b.total - a.total),
  };
}

export type Analysis = ReturnType<typeof analyze>;

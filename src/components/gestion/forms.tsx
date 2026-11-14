"use client";

import { useState } from "react";
import { addDays, effectiveSchedule, saleTotal, today } from "@/lib/gestion/compute";
import {
  CATEGORIES,
  ITEM_STATUS,
  METHODS,
  PARTNER_NAMES,
  PARTNERS,
  PAYER_NAMES,
  type Category,
  type Expense,
  type Item,
  type ItemStatus,
  type Method,
  type Order,
  type Partner,
  type Payer,
  type Payment,
  type Sale,
  type Tranche,
  type Transfer,
} from "@/lib/gestion/types";
import { Btn, F, Field, FormFooter, Modal, input, useG } from "./ui";

function useSubmit(run: () => Promise<unknown>, done: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setError("");
    try {
      await run();
      done();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, submit };
}

const num = (v: string) => (v === "" ? 0 : Number(v));

function PartnerSelect({ value, onChange, withCaisse }: { value: string; onChange: (v: string) => void; withCaisse?: boolean }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={input}>
      {PARTNERS.map((p) => (
        <option key={p} value={p}>
          {PARTNER_NAMES[p]}
        </option>
      ))}
      {withCaisse && <option value="caisse">{PAYER_NAMES.caisse} (argent des ventes)</option>}
    </select>
  );
}

function MethodSelect({ value, onChange }: { value: Method; onChange: (v: Method) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as Method)} className={input}>
      {(Object.keys(METHODS) as Method[]).filter((m) => m !== "avoir").map((m) => (
        <option key={m} value={m}>
          {METHODS[m]}
        </option>
      ))}
    </select>
  );
}

// ---------------------------------------------------------------- Orders and articles

export function OrderForm({ order, onClose, onSaved }: { order?: Order; onClose: () => void; onSaved?: (id: string) => void }) {
  const { data, call } = useG();
  const [f, setF] = useState({
    name: order?.name ?? `Commande ${data.orders.length + 1}`,
    date: order?.date ?? today(),
    supplier: order?.supplier ?? "Silk Hair",
    rate: String(order?.rate ?? 610),
    discountUsd: String(order?.discountUsd ?? 0),
    settled: order?.settled ?? false,
    note: order?.note ?? "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  let savedId = order?.id ?? "";
  const { busy, error, submit } = useSubmit(
    async () => {
      const res = await call("order.save", { order: { ...f, id: order?.id, rate: num(f.rate), discountUsd: num(f.discountUsd) } });
      savedId = String(res.id ?? savedId);
    },
    () => {
      onClose();
      onSaved?.(savedId);
    },
  );
  return (
    <Modal title={order ? "Modifier la commande" : "Nouvelle commande"} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom">
          <input required value={f.name} onChange={set("name")} className={input} />
        </Field>
        <Field label="Date de la commande">
          <input type="date" required value={f.date} onChange={set("date")} className={input} />
        </Field>
        <Field label="Fournisseur">
          <input value={f.supplier} onChange={set("supplier")} className={input} />
        </Field>
        <Field label="Taux du dollar (FCFA pour 1 $)" hint="Le taux réellement payé pour cette commande.">
          <input type="number" inputMode="decimal" min="1" required value={f.rate} onChange={set("rate")} className={input} />
        </Field>
        <Field label="Remise du fournisseur ($)">
          <input type="number" inputMode="decimal" min="0" step="0.01" value={f.discountUsd} onChange={set("discountUsd")} className={input} />
        </Field>
        <label className="flex items-start gap-2 self-end text-sm">
          <input type="checkbox" checked={f.settled} onChange={(e) => setF({ ...f, settled: e.target.checked })} className="mt-1" />
          <span>
            Fournisseur entièrement payé
            <span className="block text-xs text-muted">Le coût de la commande devient exactement ce qui a été payé, frais compris.</span>
          </span>
        </label>
        <Field label="Note" className="sm:col-span-2">
          <textarea value={f.note} onChange={set("note")} rows={2} className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm" />
        </Field>
        <div className="sm:col-span-2">
          <FormFooter busy={busy} error={error} label="Enregistrer" onCancel={onClose} />
        </div>
      </form>
    </Modal>
  );
}

export function ItemsAddForm({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const { call } = useG();
  const blank = { label: "", costUsd: "", price: "" };
  const [rows, setRows] = useState([blank, blank, blank]);
  const setRow = (i: number, k: keyof typeof blank, v: string) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const { busy, error, submit } = useSubmit(
    () => call("items.add", { orderId, items: rows.filter((r) => r.label.trim()).map((r) => ({ label: r.label, costUsd: num(r.costUsd), price: num(r.price) })) }),
    onClose,
  );
  return (
    <Modal title="Ajouter des articles" onClose={onClose} wide>
      <form onSubmit={submit}>
        <p className="mb-3 text-sm text-muted">Une ligne par article (une perruque = une ligne), avec le prix de la facture du fournisseur.</p>
        <div className="space-y-2">
          <div className="hidden grid-cols-[1fr_7rem_8rem] gap-2 text-xs font-semibold text-muted sm:grid">
            <span>Description</span>
            <span>Prix fournisseur ($)</span>
            <span>Prix de vente visé (F)</span>
          </div>
          {rows.map((r, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_7rem_8rem]">
              <input aria-label={`Description article ${i + 1}`} placeholder={'Bone Straight 16" brown, closure 2x6'} value={r.label} onChange={(e) => setRow(i, "label", e.target.value)} className={input} />
              <input aria-label={`Prix fournisseur article ${i + 1}`} type="number" inputMode="decimal" step="0.01" min="0" placeholder="$" value={r.costUsd} onChange={(e) => setRow(i, "costUsd", e.target.value)} className={input} />
              <input aria-label={`Prix visé article ${i + 1}`} type="number" inputMode="numeric" min="0" placeholder="F" value={r.price} onChange={(e) => setRow(i, "price", e.target.value)} className={input} />
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-4">
          <Btn kind="link" onClick={() => setRows([...rows, blank])}>
            + Une ligne
          </Btn>
          <Btn kind="link" onClick={() => setRows([...rows, { ...rows[rows.length - 1] }])}>
            Dupliquer la dernière ligne
          </Btn>
        </div>
        <FormFooter busy={busy} error={error} label="Ajouter les articles" onCancel={onClose} />
      </form>
    </Modal>
  );
}

export function ItemForm({ item, onClose }: { item: Item; onClose: () => void }) {
  const { call, a } = useG();
  const info = a.itemInfo.get(item.id);
  const [f, setF] = useState({
    label: item.label,
    costUsd: String(item.costUsd),
    price: item.price ? String(item.price) : "",
    minPrice: item.minPrice ? String(item.minPrice) : "",
    status: item.status,
    note: item.note ?? "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const { busy, error, submit } = useSubmit(
    () => call("item.save", { item: { ...f, id: item.id, costUsd: num(f.costUsd), price: num(f.price), minPrice: num(f.minPrice) } }),
    onClose,
  );
  const del = useSubmit(async () => {
    if (!window.confirm("Supprimer cet article ?")) throw new Error("");
    await call("item.delete", { id: item.id });
  }, onClose);
  return (
    <Modal title="Modifier l'article" onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Description" className="sm:col-span-2">
          <input required value={f.label} onChange={set("label")} className={input} />
        </Field>
        <Field label="Prix fournisseur ($)" hint={info ? `Coût de revient actuel : ${F(info.cost)}` : undefined}>
          <input type="number" inputMode="decimal" step="0.01" min="0" value={f.costUsd} onChange={set("costUsd")} className={input} />
        </Field>
        <Field label="État">
          <select value={f.status} onChange={set("status")} className={input} disabled={Boolean(info?.sale)}>
            {(Object.keys(ITEM_STATUS) as ItemStatus[]).map((s) => (
              <option key={s} value={s}>
                {ITEM_STATUS[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Prix de vente visé (F)">
          <input type="number" inputMode="numeric" min="0" value={f.price} onChange={set("price")} className={input} />
        </Field>
        <Field label="Prix minimum accepté (F)">
          <input type="number" inputMode="numeric" min="0" value={f.minPrice} onChange={set("minPrice")} className={input} />
        </Field>
        <Field label="Note" className="sm:col-span-2" hint="Par exemple : réservée par Awa, montée au Cameroun, offerte…">
          <input value={f.note} onChange={set("note")} className={input} />
        </Field>
        <div className="sm:col-span-2">
          <FormFooter
            busy={busy || del.busy}
            error={error || del.error}
            label="Enregistrer"
            onCancel={onClose}
            extra={
              !info?.sale && (
                <Btn kind="danger" onClick={() => del.submit()}>
                  Supprimer
                </Btn>
              )
            }
          />
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------- Money

export function ExpenseForm({
  expense,
  preset,
  onClose,
}: {
  expense?: Expense;
  preset?: Partial<Pick<Expense, "orderId" | "itemId" | "category" | "label" | "paidBy">>;
  onClose: () => void;
}) {
  const { data, call, me } = useG();
  const e0 = { ...preset, ...expense };
  const [f, setF] = useState({
    date: e0.date ?? today(),
    category: (e0.category ?? "accessoires") as Category,
    label: e0.label ?? "",
    amount: e0.amount ? String(e0.amount) : "",
    paidBy: (e0.paidBy ?? me) as Payer,
    via: e0.via ?? "",
    orderId: e0.orderId ?? (e0.itemId ? data.items.find((i) => i.id === e0.itemId)?.orderId : "") ?? "",
    itemId: e0.itemId ?? "",
    note: e0.note ?? "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const orderItems = data.items.filter((i) => i.orderId === f.orderId);
  const { busy, error, submit } = useSubmit(
    () => call("move.save", { move: { ...f, kind: "expense", id: expense?.id, amount: num(f.amount) } }),
    onClose,
  );
  return (
    <Modal title={expense ? "Modifier la dépense" : "Nouvelle dépense"} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Type de dépense">
          <select value={f.category} onChange={set("category")} className={input}>
            {(Object.keys(CATEGORIES) as Category[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORIES[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date">
          <input type="date" required value={f.date} onChange={set("date")} className={input} />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <input required value={f.label} onChange={set("label")} placeholder="Fer à boucler, ring light, taxi marché…" className={input} />
        </Field>
        <Field label="Montant (F)">
          <input type="number" inputMode="numeric" min="1" required value={f.amount} onChange={set("amount")} className={input} />
        </Field>
        <Field label="Payé par" hint={f.paidBy === "caisse" ? "Avec l'argent des ventes." : "De sa poche : compte comme son apport."}>
          <PartnerSelect value={f.paidBy} onChange={(v) => setF({ ...f, paidBy: v as Payer })} withCaisse />
        </Field>
        {f.paidBy === "caisse" && (
          <Field label="L'argent de la caisse était chez" className="sm:col-span-2">
            <select value={f.via} onChange={set("via")} className={input}>
              <option value="">Non précisé</option>
              {PARTNERS.map((p) => (
                <option key={p} value={p}>
                  {PARTNER_NAMES[p]}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Liée à une commande" hint="Les frais liés à une commande entrent dans le coût de ses articles.">
          <select value={f.orderId} onChange={(e) => setF({ ...f, orderId: e.target.value, itemId: "" })} className={input}>
            <option value="">Aucune (dépense générale)</option>
            {data.orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </Field>
        {f.orderId && (
          <Field label="Pour un seul article ?">
            <select value={f.itemId} onChange={set("itemId")} className={input}>
              <option value="">Toute la commande</option>
              {orderItems.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.label}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Note" className="sm:col-span-2">
          <input value={f.note} onChange={set("note")} className={input} />
        </Field>
        <div className="sm:col-span-2">
          <FormFooter busy={busy} error={error} label="Enregistrer" onCancel={onClose} />
        </div>
      </form>
    </Modal>
  );
}

export function TransferForm({ transfer, preset, onClose }: { transfer?: Transfer; preset?: Partial<Transfer>; onClose: () => void }) {
  const { call, me } = useG();
  const t0 = { ...preset, ...transfer };
  const [f, setF] = useState({
    date: t0.date ?? today(),
    from: (t0.from ?? me) as Payer,
    to: (t0.to ?? (me === "yvaltt" ? "lisa" : "yvaltt")) as Payer,
    amount: t0.amount ? String(t0.amount) : "",
    label: t0.label ?? "",
    via: t0.via ?? "",
    note: t0.note ?? "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const presets: [string, Payer, Payer, string][] = [
    ["Règlement entre associés", me, me === "yvaltt" ? "lisa" : "yvaltt", "Règlement entre associés"],
    ["Dépôt dans la caisse", me, "caisse", "Dépôt dans la caisse"],
    ["Retrait de la caisse", "caisse", me, "Retrait de la caisse"],
  ];
  const { busy, error, submit } = useSubmit(
    () => call("move.save", { move: { ...f, kind: "transfer", id: transfer?.id, amount: num(f.amount) } }),
    onClose,
  );
  const touchesCaisse = f.from === "caisse" || f.to === "caisse";
  return (
    <Modal title={transfer ? "Modifier le mouvement" : "Mouvement d'argent entre vous"} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {!transfer && (
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            {presets.map(([name, from, to, label]) => (
              <Btn key={name} kind="secondary" onClick={() => setF({ ...f, from, to, label })}>
                {name}
              </Btn>
            ))}
          </div>
        )}
        <Field label="De">
          <PartnerSelect value={f.from} onChange={(v) => setF({ ...f, from: v as Payer })} withCaisse />
        </Field>
        <Field label="À">
          <PartnerSelect value={f.to} onChange={(v) => setF({ ...f, to: v as Payer })} withCaisse />
        </Field>
        <Field label="Montant (F)">
          <input type="number" inputMode="numeric" min="1" required value={f.amount} onChange={set("amount")} className={input} />
        </Field>
        <Field label="Date">
          <input type="date" required value={f.date} onChange={set("date")} className={input} />
        </Field>
        <Field label="Libellé" className="sm:col-span-2">
          <input value={f.label} onChange={set("label")} className={input} />
        </Field>
        {touchesCaisse && (
          <Field label={f.to === "caisse" ? "Qui garde cet argent de la caisse ?" : "Chez qui l'argent de la caisse était-il ?"} className="sm:col-span-2">
            <select value={f.via} onChange={set("via")} className={input}>
              <option value="">{f.to === "caisse" && f.from !== "caisse" ? PARTNER_NAMES[f.from as Partner] : "Non précisé"}</option>
              {PARTNERS.map((p) => (
                <option key={p} value={p}>
                  {PARTNER_NAMES[p]}
                </option>
              ))}
            </select>
          </Field>
        )}
        <div className="sm:col-span-2">
          <FormFooter busy={busy} error={error} label="Enregistrer" onCancel={onClose} />
        </div>
      </form>
    </Modal>
  );
}

export function PaymentForm({ sale, payment, onClose }: { sale: Sale; payment?: Payment; onClose: () => void }) {
  const { call, me, a } = useG();
  const info = a.saleInfo.get(sale.id);
  const suggested = info?.next?.amount ?? Math.max(0, info?.remaining ?? 0);
  const [f, setF] = useState({
    date: payment?.date ?? today(),
    amount: String(payment?.amount ?? suggested),
    method: (payment?.method ?? "momo") as Method,
    receivedBy: (payment?.receivedBy ?? me) as Partner,
    note: payment?.note ?? "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const { busy, error, submit } = useSubmit(
    () => call("move.save", { move: { ...f, kind: "payment", id: payment?.id, saleId: sale.id, amount: num(f.amount) } }),
    onClose,
  );
  return (
    <Modal title={payment ? "Modifier le paiement" : `Encaisser un paiement de ${sale.customer.name}`} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {info && (
          <p className="text-sm text-muted sm:col-span-2">
            Reste à payer : <strong className="text-plum">{F(info.remaining)}</strong>
            {info.next && ` · prochaine échéance ${F(info.next.amount)} le ${info.next.date.split("-").reverse().join("/")}`}
          </p>
        )}
        <Field label="Montant reçu (F)">
          <input type="number" inputMode="numeric" min="1" required value={f.amount} onChange={set("amount")} className={input} />
        </Field>
        <Field label="Date">
          <input type="date" required value={f.date} onChange={set("date")} className={input} />
        </Field>
        <Field label="Moyen de paiement">
          <MethodSelect value={f.method} onChange={(method) => setF({ ...f, method })} />
        </Field>
        <Field label="Reçu par" hint="L'argent va dans la caisse ; on note juste qui l'a en main.">
          <PartnerSelect value={f.receivedBy} onChange={(v) => setF({ ...f, receivedBy: v as Partner })} />
        </Field>
        <Field label="Note" className="sm:col-span-2">
          <input value={f.note} onChange={set("note")} className={input} />
        </Field>
        <div className="sm:col-span-2">
          <FormFooter busy={busy} error={error} label="Enregistrer le paiement" onCancel={onClose} />
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------- Sales

/** Splits `amount` into `n` tranches, one per month from `start`. */
function splitTranches(amount: number, n: number, start: string): Tranche[] {
  const each = Math.floor(amount / n / 500) * 500 || Math.floor(amount / n);
  return Array.from({ length: n }, (_, i) => ({ date: addDays(start, 30 * i), amount: i === n - 1 ? amount - each * (n - 1) : each }));
}

export function SaleForm({ sale, preItem, onClose, onSaved }: { sale?: Sale; preItem?: string; onClose: () => void; onSaved?: (id: string) => void }) {
  const { data, a, call, me } = useG();
  const itemPrice = (id: string) => data.items.find((i) => i.id === id)?.price ?? 0;
  const [name, setName] = useState(sale?.customer.name ?? "");
  const [phone, setPhone] = useState(sale?.customer.phone ?? "");
  const [date, setDate] = useState(sale?.date ?? today());
  // Returned lines are managed in the Retours tab and kept by the server.
  const [lines, setLines] = useState(
    sale ? sale.lines.filter((l) => !l.returned).map(({ itemId, price }) => ({ itemId, price })) : preItem ? [{ itemId: preItem, price: itemPrice(preItem) }] : [],
  );
  const [discount, setDiscount] = useState(String(sale?.discount ?? 0));
  const [rate, setRate] = useState(sale?.rate ? String(sale.rate) : "");
  const [note, setNote] = useState(sale?.note ?? "");
  const [mode, setMode] = useState<"total" | "tranches" | "plus_tard">(sale ? (sale.schedule.length ? "tranches" : "total") : "total");
  const [method, setMethod] = useState<Method>("momo");
  const [receivedBy, setReceivedBy] = useState<Partner>(me);
  const [deposit, setDeposit] = useState("");
  const [tranches, setTranches] = useState<{ date: string; amount: string }[]>(
    sale ? effectiveSchedule(sale).map((t) => ({ date: t.date, amount: String(t.amount) })) : [],
  );
  const [count, setCount] = useState(2);

  const total = saleTotal({ lines, discount: num(discount) });
  const cost = lines.reduce((s, l) => s + (a.itemInfo.get(l.itemId)?.cost ?? 0), 0);
  const available = data.items.filter((i) => {
    const st = a.itemInfo.get(i.id)?.state;
    return (st === "stock" || st === "reserve") && !lines.some((l) => l.itemId === i.id);
  });
  const isNew = !sale;
  const depositAmount = mode === "tranches" && isNew ? num(deposit) : 0;
  const scheduleSum = depositAmount + tranches.reduce((s, t) => s + num(t.amount), 0);

  const { busy, error, submit } = useSubmit(
    async () => {
      if (!lines.length) throw new Error("Choisissez au moins un article.");
      let schedule: Tranche[] = [];
      let payment: Record<string, unknown> | null = null;
      if (mode === "tranches" || mode === "plus_tard") {
        schedule = [...(depositAmount ? [{ date, amount: depositAmount }] : []), ...tranches.map((t) => ({ date: t.date, amount: num(t.amount) }))];
        if (!schedule.length) throw new Error("Indiquez les dates d'échéance.");
        if (depositAmount) payment = { amount: depositAmount, method, receivedBy, date };
      } else if (mode === "total" && isNew) payment = { amount: total, method, receivedBy, date };
      const res = await call("sale.save", {
        sale: { id: sale?.id, customer: { name, phone }, date, lines, discount: num(discount), rate: num(rate), note, schedule },
        payment,
      });
      onSaved?.(String(res.id));
    },
    onClose,
  );

  return (
    <Modal title={sale ? "Modifier la vente" : "Nouvelle vente"} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Nom de la cliente">
            <input required value={name} onChange={(e) => setName(e.target.value)} className={input} />
          </Field>
          <Field label="Téléphone WhatsApp" hint="Pour envoyer la facture et les rappels.">
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="6 99 12 34 56" className={input} />
          </Field>
          <Field label="Date de la vente">
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={input} />
          </Field>
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-rust">Articles vendus</legend>
          <div className="mt-2 space-y-2">
            {lines.map((l, i) => {
              const info = a.itemInfo.get(l.itemId);
              const usd = info?.item.costUsd ?? 0;
              return (
                <div key={l.itemId} className="grid items-center gap-2 rounded-lg border border-line bg-white p-3 sm:grid-cols-[1fr_9rem_auto]">
                  <div className="text-sm">
                    <p className="font-semibold text-plum">{info?.item.label}</p>
                    <p className="text-xs text-muted">
                      {info?.order?.name} · coût de revient {F(info?.cost ?? 0)}
                      {info?.item.minPrice ? ` · minimum ${F(info.item.minPrice)}` : ""}
                      {num(rate) > 0 && usd > 0 ? ` · ${usd} $ × ${rate} = ${F(Math.round(usd * num(rate)))}` : ""}
                    </p>
                  </div>
                  <input
                    aria-label={`Prix de vente de ${info?.item.label}`}
                    type="number"
                    inputMode="numeric"
                    min="0"
                    required
                    value={l.price || ""}
                    onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, price: num(e.target.value) } : x)))}
                    className={input}
                  />
                  <button type="button" aria-label="Retirer l'article" onClick={() => setLines(lines.filter((_, j) => j !== i))} className="text-xl text-wine">
                    ×
                  </button>
                </div>
              );
            })}
            <select
              aria-label="Ajouter un article"
              value=""
              onChange={(e) => e.target.value && setLines([...lines, { itemId: e.target.value, price: itemPrice(e.target.value) }])}
              className={input}
            >
              <option value="">+ Ajouter un article du stock…</option>
              {data.orders.map((o) => (
                <optgroup key={o.id} label={o.name}>
                  {available
                    .filter((i) => i.orderId === o.id)
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.label}
                        {i.price ? ` (${F(i.price)})` : ""}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Remise (F)">
            <input type="number" inputMode="numeric" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} className={input} />
          </Field>
          <Field label="Taux du dollar appliqué (facultatif)" hint="Pour comparer avec le prix fournisseur.">
            <input type="number" inputMode="numeric" min="0" value={rate} onChange={(e) => setRate(e.target.value)} className={input} />
          </Field>
          <div className="rounded-lg bg-sand p-3 text-sm">
            <p>
              Total : <strong className="text-plum">{F(total)}</strong>
            </p>
            <p className={total - cost < 0 ? "text-wine" : "text-muted"}>Marge : {F(total - cost)}</p>
          </div>
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-rust">Paiement</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(
              [
                ["total", isNew ? "Payé en totalité maintenant" : "En une fois"],
                ["tranches", "Par tranches"],
                ...(isNew ? [["plus_tard", "Paiera en une fois plus tard"]] : []),
              ] as [typeof mode, string][]
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => {
                  if (m !== mode) setTranches([]);
                  setMode(m);
                }}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold ${mode === m ? "border-plum bg-plum text-gold-soft" : "border-line bg-white text-plum"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {isNew && (mode === "total" || mode === "tranches") && (
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              {mode === "tranches" && (
                <Field label="Acompte payé aujourd'hui (F)">
                  <input type="number" inputMode="numeric" min="0" value={deposit} onChange={(e) => setDeposit(e.target.value)} className={input} />
                </Field>
              )}
              <Field label="Moyen de paiement">
                <MethodSelect value={method} onChange={setMethod} />
              </Field>
              <Field label="Reçu par">
                <PartnerSelect value={receivedBy} onChange={(v) => setReceivedBy(v as Partner)} />
              </Field>
            </div>
          )}

          {mode === "plus_tard" && (
            <Field label="Date limite de paiement" className="mt-3 max-w-xs">
              <input
                type="date"
                required
                value={tranches[0]?.date ?? ""}
                onChange={(e) => {
                  setTranches([{ date: e.target.value, amount: String(total) }]);
                }}
                className={input}
              />
            </Field>
          )}

          {mode === "tranches" && (
            <div className="mt-4 space-y-2">
              <div className="flex flex-wrap items-end gap-2 text-sm">
                <span>Répartir le reste ({F(Math.max(0, total - depositAmount))}) en</span>
                <select aria-label="Nombre de tranches" value={count} onChange={(e) => setCount(Number(e.target.value))} className="h-9 rounded-lg border border-line bg-white px-2">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <span>tranches mensuelles</span>
                <Btn kind="secondary" onClick={() => setTranches(splitTranches(Math.max(0, total - depositAmount), count, addDays(date, 30)).map((t) => ({ date: t.date, amount: String(t.amount) })))}>
                  Calculer
                </Btn>
              </div>
              {tranches.map((t, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                  <input aria-label={`Échéance ${i + 1}`} type="date" required value={t.date} onChange={(e) => setTranches(tranches.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} className={input} />
                  <input aria-label={`Montant ${i + 1}`} type="number" inputMode="numeric" min="0" required value={t.amount} onChange={(e) => setTranches(tranches.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} className={input} />
                  <button type="button" aria-label="Supprimer la tranche" onClick={() => setTranches(tranches.filter((_, j) => j !== i))} className="text-xl text-wine">
                    ×
                  </button>
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <Btn kind="link" onClick={() => setTranches([...tranches, { date: addDays(tranches[tranches.length - 1]?.date ?? date, 30), amount: "" }])}>
                  + Une tranche
                </Btn>
                <span className={scheduleSum === total ? "text-whatsapp" : "text-wine"}>
                  {isNew && depositAmount ? "Acompte + tranches" : "Tranches"} : {F(scheduleSum)} sur {F(total)}
                  {scheduleSum !== total && " (la dernière tranche sera ajustée)"}
                </span>
              </div>
            </div>
          )}
        </fieldset>

        <Field label="Note">
          <input value={note} onChange={(e) => setNote(e.target.value)} className={input} />
        </Field>

        <FormFooter busy={busy} error={error} label={sale ? "Enregistrer" : "Enregistrer la vente"} onCancel={onClose} />
      </form>
    </Modal>
  );
}

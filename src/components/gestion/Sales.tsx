"use client";

import { useEffect, useState } from "react";
import { effectiveSchedule, fmtDate, invoiceNumber, returnNumber, SALE_STATUS, today, type SaleInfo, type SaleStatus } from "@/lib/gestion/compute";
import { invoiceMessage, reminderMessage, waLink } from "@/lib/gestion/messages";
import { METHODS, PARTNER_NAMES, PARTNERS, RETURN_SOLUTIONS, type Method, type Partner, type Payment, type Sale } from "@/lib/gestion/types";
import { PaymentForm, SaleForm } from "./forms";
import { Badge, Btn, Empty, F, Field, FormFooter, Modal, input, signed, useG } from "./ui";

/** Uses a customer's credit (left after a return) on another sale, or gives it back. */
function CreditForm({ info, onClose }: { info: SaleInfo; onClose: () => void }) {
  const { a, call, me } = useG();
  const [mode, setMode] = useState<"use" | "refund">("use");
  const [toSaleId, setToSaleId] = useState("");
  const [amount, setAmount] = useState(String(info.credit));
  const [method, setMethod] = useState<Method>("momo");
  const [by, setBy] = useState<Partner>(me);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const phone = info.sale.customer.phone.replace(/\D/g, "");
  // Sales still to pay, the same customer's first.
  const targets = [...a.saleInfo.values()]
    .filter((s) => s.sale.id !== info.sale.id && s.remaining > 0)
    .sort((x, y) => Number(y.sale.customer.phone.replace(/\D/g, "") === phone) - Number(x.sale.customer.phone.replace(/\D/g, "") === phone));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "use") await call("credit.use", { fromSaleId: info.sale.id, toSaleId, amount: Number(amount), by: me, date: today() });
      else await call("credit.refund", { saleId: info.sale.id, amount: Number(amount), method, by, date: today() });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={`Avoir de ${info.sale.customer.name} : ${F(info.credit)}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["use", "Utiliser sur une autre vente"],
              ["refund", "Rembourser la cliente"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold ${mode === m ? "border-plum bg-plum text-gold-soft" : "border-line bg-white text-plum"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {mode === "use" ? (
          <Field label="Vente à régler avec l'avoir" hint="Créez d'abord la nouvelle vente en choisissant « Paiera en une fois plus tard ».">
            <select required value={toSaleId} onChange={(e) => setToSaleId(e.target.value)} className={input}>
              <option value="">Choisir…</option>
              {targets.map((s) => (
                <option key={s.sale.id} value={s.sale.id}>
                  {s.sale.customer.name}, {invoiceNumber(s.sale)} (reste {F(s.remaining)})
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Moyen">
              <select value={method} onChange={(e) => setMethod(e.target.value as Method)} className={input}>
                {(Object.keys(METHODS) as Method[])
                  .filter((m) => m !== "avoir")
                  .map((m) => (
                    <option key={m} value={m}>
                      {METHODS[m]}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Remboursé par">
              <select value={by} onChange={(e) => setBy(e.target.value as Partner)} className={input}>
                {PARTNERS.map((p) => (
                  <option key={p} value={p}>
                    {PARTNER_NAMES[p]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}
        <Field label="Montant (F)">
          <input type="number" inputMode="numeric" min="1" max={info.credit} required value={amount} onChange={(e) => setAmount(e.target.value)} className={input} />
        </Field>
        <FormFooter busy={busy} error={error} label="Enregistrer" onCancel={onClose} />
      </form>
    </Modal>
  );
}

export const saleTone = (s: SaleStatus) => (s === "payee" ? "good" : s === "retard" ? "bad" : s === "partielle" ? "warn" : "neutral") as "good" | "bad" | "warn" | "neutral";

/** Public invoice address, signed so it cannot be guessed. */
export function useInvoiceUrl() {
  const { keys } = useG();
  return (saleId: string) => `${typeof window === "undefined" ? "" : window.location.origin}/facture/${saleId}?k=${keys[saleId] ?? ""}`;
}

/** WhatsApp buttons for a sale: invoice and reminder. Reminders are logged. */
export function WhatsAppActions({ info }: { info: SaleInfo }) {
  const { a, call } = useG();
  const url = useInvoiceUrl()(info.sale.id);
  const phone = info.sale.customer.phone;
  if (!phone) return <p className="text-xs text-muted">Ajoutez le téléphone de la cliente pour lui envoyer la facture sur WhatsApp.</p>;
  const labels = info.sale.lines.filter((l) => !l.returned).map((l) => a.itemInfo.get(l.itemId)?.item.label ?? "Article");
  return (
    <div className="flex flex-wrap gap-2">
      <a href={waLink(phone, invoiceMessage(info, labels, url))} target="_blank" rel="noopener noreferrer" className="rounded-full bg-whatsapp px-4 py-2 text-sm font-semibold text-white hover:brightness-110">
        Envoyer la facture sur WhatsApp
      </a>
      {info.remaining > 0 && (
        <a
          href={waLink(phone, reminderMessage(info, url))}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => void call("sale.remind", { id: info.sale.id }).catch(() => {})}
          className="rounded-full border border-whatsapp px-4 py-2 text-sm font-semibold text-whatsapp hover:bg-whatsapp hover:text-white"
        >
          Relancer sur WhatsApp
        </a>
      )}
    </div>
  );
}

function SaleDetail({ sale, onBack }: { sale: Sale; onBack: () => void }) {
  const { data, a, call, go } = useG();
  const info = a.saleInfo.get(sale.id);
  const invoiceUrl = useInvoiceUrl()(sale.id);
  const [modal, setModal] = useState<{ kind: "edit" } | { kind: "pay"; payment?: Payment } | { kind: "credit" } | null>(null);
  const [error, setError] = useState("");
  if (!info) return null;
  const run = async (action: string, payload: Record<string, unknown>, confirmText: string, after?: () => void) => {
    if (!window.confirm(confirmText)) return;
    try {
      await call(action, payload);
      after?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  };
  let cum = 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Btn kind="link" onClick={onBack}>
            Toutes les ventes
          </Btn>
          <h2 className="mt-1 font-display text-3xl font-bold text-plum">
            {sale.customer.name} <span className="text-lg font-normal text-muted">facture {invoiceNumber(sale)}</span>
          </h2>
          <p className="text-sm text-muted">
            {fmtDate(sale.date)} · {sale.customer.phone || "pas de téléphone"}
            {sale.rate ? ` · taux appliqué ${sale.rate} F/$` : ""}
          </p>
          {sale.note && <p className="mt-1 text-sm">{sale.note}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={invoiceUrl} target="_blank" rel="noopener noreferrer" className="rounded-full border border-plum bg-white px-4 py-2 text-sm font-semibold text-plum hover:bg-sand">
            Voir la facture
          </a>
          <Btn kind="secondary" onClick={() => setModal({ kind: "edit" })}>
            Modifier
          </Btn>
          <Btn kind="danger" onClick={() => run("sale.delete", { id: sale.id }, "Supprimer cette vente et ses paiements ? Les articles redeviennent disponibles.", onBack)}>
            Supprimer
          </Btn>
        </div>
      </div>
      {error && <p className="text-sm font-semibold text-wine">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-line bg-white p-4">
          <p className="text-sm text-muted">Total</p>
          <p className="font-display text-2xl font-bold text-plum">{F(info.total)}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4">
          <p className="text-sm text-muted">Payé</p>
          <p className="font-display text-2xl font-bold text-plum">{F(info.paid)}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4">
          <p className="text-sm text-muted">Reste à payer</p>
          <p className={`font-display text-2xl font-bold ${info.remaining > 0 ? "text-wine" : "text-whatsapp"}`}>{F(Math.max(0, info.remaining))}</p>
          <Badge tone={saleTone(info.status)}>{SALE_STATUS[info.status]}</Badge>
        </div>
        <div className="rounded-xl border border-line bg-white p-4">
          <p className="text-sm text-muted">Marge</p>
          <p className={`font-display text-2xl font-bold ${info.margin < 0 ? "text-wine" : "text-plum"}`}>{F(info.margin)}</p>
          <p className="text-xs text-muted">coût de revient {F(info.cost)}</p>
        </div>
      </div>

      {info.credit > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-whatsapp bg-white p-4 text-sm">
          <p>
            <strong className="text-whatsapp">Avoir de {F(info.credit)}</strong> : la cliente a payé plus que ce qu&apos;elle garde. À utiliser sur un
            prochain achat ou à lui rembourser.
          </p>
          <Btn onClick={() => setModal({ kind: "credit" })}>Utiliser l&apos;avoir</Btn>
        </div>
      )}

      <WhatsAppActions info={info} />
      {sale.reminders.length > 0 && (
        <p className="text-xs text-muted">
          Relancée {sale.reminders.length} fois, la dernière le {fmtDate(today(new Date(sale.reminders[sale.reminders.length - 1])))}.
        </p>
      )}

      <section>
        <h3 className="font-display text-xl font-bold text-plum">Articles</h3>
        <ul className="mt-2 divide-y divide-line rounded-xl border border-line bg-white">
          {sale.lines.map((l) => {
            const ii = a.itemInfo.get(l.itemId);
            // Return that took this line out of the sale, or that swapped this article in.
            const r = data.returns.find((x) => x.saleId === sale.id && (x.itemId === l.itemId || x.replacementItemId === l.itemId));
            return (
              <li key={l.itemId} className={`flex flex-wrap items-center justify-between gap-2 p-3 text-sm ${l.returned ? "bg-sand/60" : ""}`}>
                <span>
                  <span className={`font-semibold ${l.returned ? "text-muted line-through" : "text-plum"}`}>{ii?.item.label ?? "Article supprimé"}</span>
                  {r && (
                    <button type="button" onClick={() => go("retours")} className="ml-2">
                      <Badge tone="warn">
                        {l.returned ? "Retournée" : "Donnée en échange"}, {returnNumber(r)}
                        {r.solution && l.returned ? ` (${RETURN_SOLUTIONS[r.solution].toLowerCase()})` : ""}
                      </Badge>
                    </button>
                  )}
                  <span className="block text-xs text-muted">
                    Provenance :{" "}
                    {ii?.order ? (
                      <button type="button" className="underline" onClick={() => go("commandes", { openOrder: ii.order!.id })}>
                        {ii.order.name}
                      </button>
                    ) : (
                      "inconnue"
                    )}{" "}
                    · coût {F(ii?.cost ?? 0)}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  {!l.returned && (
                    <Btn kind="link" onClick={() => go("retours", { reportItem: l.itemId })}>
                      Signaler un défaut
                    </Btn>
                  )}
                  <span className={`font-semibold tabular-nums ${l.returned ? "text-muted line-through" : ""}`}>{F(l.price)}</span>
                </span>
              </li>
            );
          })}
          {sale.discount > 0 && (
            <li className="flex justify-between p-3 text-sm">
              <span>Remise</span>
              <span className="tabular-nums">− {F(sale.discount)}</span>
            </li>
          )}
        </ul>
      </section>

      <section>
        <h3 className="font-display text-xl font-bold text-plum">Échéancier</h3>
        <ul className="mt-2 divide-y divide-line rounded-xl border border-line bg-white">
          {effectiveSchedule(sale).map((t, i) => {
            cum += t.amount;
            const covered = info.paid >= cum;
            const late = !covered && t.date <= a.on;
            return (
              <li key={i} className="flex items-center justify-between gap-2 p-3 text-sm">
                <span>
                  {sale.schedule.length ? `Tranche ${i + 1}` : "Paiement"} · {fmtDate(t.date)}
                </span>
                <span className="flex items-center gap-3">
                  <span className="tabular-nums">{F(t.amount)}</span>
                  <Badge tone={covered ? "good" : late ? "bad" : "neutral"}>{covered ? "Payée" : late ? "En retard" : "À venir"}</Badge>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-xl font-bold text-plum">Paiements reçus</h3>
          {info.remaining > 0 && <Btn onClick={() => setModal({ kind: "pay" })}>Encaisser un paiement</Btn>}
        </div>
        {info.payments.length ? (
          <ul className="mt-2 divide-y divide-line rounded-xl border border-line bg-white">
            {info.payments.map((p) => {
              const special = Boolean(p.returnId) || p.method === "avoir" || p.amount < 0;
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                  <span>
                    {fmtDate(p.date)} · {METHODS[p.method]} · {p.amount < 0 ? `rendu par ${PARTNER_NAMES[p.receivedBy]}` : `reçu par ${PARTNER_NAMES[p.receivedBy]}`}
                    {p.note && <span className="block text-xs text-muted">{p.note}</span>}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className={`font-semibold tabular-nums ${p.amount < 0 ? "text-wine" : ""}`}>{p.amount < 0 ? signed(p.amount) : F(p.amount)}</span>
                    {!special && (
                      <Btn kind="link" onClick={() => setModal({ kind: "pay", payment: p })}>
                        Modifier
                      </Btn>
                    )}
                    {p.returnId ? (
                      <span className="text-xs text-muted">géré dans Retours</span>
                    ) : (
                      <Btn kind="link" className="text-wine" onClick={() => run("move.delete", { id: p.id }, `Supprimer ce mouvement de ${F(Math.abs(p.amount))} ?`)}>
                        Supprimer
                      </Btn>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-2">
            <Empty>Aucun paiement reçu pour cette vente.</Empty>
          </div>
        )}
      </section>

      {modal?.kind === "edit" && <SaleForm sale={sale} onClose={() => setModal(null)} />}
      {modal?.kind === "pay" && <PaymentForm sale={sale} payment={modal.payment} onClose={() => setModal(null)} />}
      {modal?.kind === "credit" && <CreditForm info={info} onClose={() => setModal(null)} />}
    </div>
  );
}

export default function Sales() {
  const { data, a, intent, clearIntent } = useG();
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState<{ preItem?: string } | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | SaleStatus | "dues">("");

  useEffect(() => {
    if (intent?.openSale) setOpen(intent.openSale);
    if (intent?.sellItem) setForm({ preItem: intent.sellItem });
    if (intent) clearIntent();
  }, [intent, clearIntent]);

  const sale = data.sales.find((s) => s.id === open);
  if (sale)
    return (
      <>
        <SaleDetail sale={sale} onBack={() => setOpen(null)} />
      </>
    );

  const rows = [...a.saleInfo.values()]
    .filter((s) => {
      if (status === "dues" ? s.remaining <= 0 : status && s.status !== status) return false;
      if (!q) return true;
      const labels = s.sale.lines.map((l) => a.itemInfo.get(l.itemId)?.item.label ?? "").join(" ");
      return `${s.sale.customer.name} ${s.sale.customer.phone} ${invoiceNumber(s.sale)} ${labels}`.toLowerCase().includes(q.toLowerCase());
    })
    .sort((x, y) => y.sale.date.localeCompare(x.sale.date) || y.sale.number - x.sale.number);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_auto]">
          <input type="search" aria-label="Rechercher une vente" placeholder="Cliente, téléphone, n° de facture, article…" value={q} onChange={(e) => setQ(e.target.value)} className={input} />
          <select aria-label="Statut" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={input}>
            <option value="">Toutes les ventes</option>
            <option value="dues">Avec un reste à payer</option>
            <option value="retard">En retard</option>
            <option value="partielle">Paiement partiel</option>
            <option value="payee">Payées</option>
          </select>
        </div>
        <Btn onClick={() => setForm({})}>Nouvelle vente</Btn>
      </div>
      {rows.length ? (
        <ul className="divide-y divide-line rounded-xl border border-line bg-white">
          {rows.map((s) => (
            <li key={s.sale.id}>
              <button type="button" onClick={() => setOpen(s.sale.id)} className="flex w-full flex-wrap items-center justify-between gap-3 p-3 text-left text-sm hover:bg-ivory">
                <span className="min-w-0 flex-1">
                  <span className="font-semibold text-plum">{s.sale.customer.name}</span>
                  <span className="block text-xs text-muted">
                    {invoiceNumber(s.sale)} · {fmtDate(s.sale.date)} ·{" "}
                    {s.sale.lines.map((l) => a.itemInfo.get(l.itemId)?.item.label ?? "Article").join(", ")}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-semibold tabular-nums">{F(s.total)}</span>
                  {s.remaining > 0 && <span className="block text-xs text-wine">reste {F(s.remaining)}</span>}
                </span>
                <Badge tone={saleTone(s.status)}>{SALE_STATUS[s.status]}</Badge>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>{data.sales.length ? "Aucune vente ne correspond." : "Aucune vente. Vendez un article depuis le stock ou avec « Nouvelle vente »."}</Empty>
      )}
      {form && <SaleForm preItem={form.preItem} onClose={() => setForm(null)} onSaved={(id) => setOpen(id)} />}
    </div>
  );
}

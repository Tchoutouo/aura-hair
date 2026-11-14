"use client";

import { useEffect, useState } from "react";
import { effectiveSchedule, fmtDate, invoiceNumber, SALE_STATUS, today, type SaleInfo, type SaleStatus } from "@/lib/gestion/compute";
import { invoiceMessage, reminderMessage, waLink } from "@/lib/gestion/messages";
import { METHODS, PARTNER_NAMES, type Payment, type Sale } from "@/lib/gestion/types";
import { PaymentForm, SaleForm } from "./forms";
import { Badge, Btn, Empty, F, input, useG } from "./ui";

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
  const labels = info.sale.lines.map((l) => a.itemInfo.get(l.itemId)?.item.label ?? "Article");
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
  const { a, call, go } = useG();
  const info = a.saleInfo.get(sale.id);
  const invoiceUrl = useInvoiceUrl()(sale.id);
  const [modal, setModal] = useState<{ kind: "edit" } | { kind: "pay"; payment?: Payment } | null>(null);
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
            return (
              <li key={l.itemId} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <span>
                  <span className="font-semibold text-plum">{ii?.item.label ?? "Article supprimé"}</span>
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
                <span className="font-semibold tabular-nums">{F(l.price)}</span>
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
            {info.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <span>
                  {fmtDate(p.date)} · {METHODS[p.method]} · reçu par {PARTNER_NAMES[p.receivedBy]}
                  {p.note && <span className="block text-xs text-muted">{p.note}</span>}
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-semibold tabular-nums">{F(p.amount)}</span>
                  <Btn kind="link" onClick={() => setModal({ kind: "pay", payment: p })}>
                    Modifier
                  </Btn>
                  <Btn kind="link" className="text-wine" onClick={() => run("move.delete", { id: p.id }, `Supprimer ce paiement de ${F(p.amount)} ?`)}>
                    Supprimer
                  </Btn>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-2">
            <Empty>Aucun paiement reçu pour cette vente.</Empty>
          </div>
        )}
      </section>

      {modal?.kind === "edit" && <SaleForm sale={sale} onClose={() => setModal(null)} />}
      {modal?.kind === "pay" && <PaymentForm sale={sale} payment={modal.payment} onClose={() => setModal(null)} />}
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

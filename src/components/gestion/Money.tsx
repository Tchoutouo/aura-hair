"use client";

import { useState } from "react";
import { fmtDate } from "@/lib/gestion/compute";
import { CATEGORIES, METHODS, PARTNER_NAMES, PARTNERS, PAYER_NAMES, type Category, type Expense, type Movement, type Transfer } from "@/lib/gestion/types";
import { ExpenseForm, PaymentForm, TransferForm } from "./forms";
import { Btn, Empty, F, input, signed, useG } from "./ui";

type Kind = "" | "payment" | "expense" | "transfer";

export default function Money() {
  const { data, a, call, go } = useG();
  const [kind, setKind] = useState<Kind>("");
  const [who, setWho] = useState("");
  const [month, setMonth] = useState("");
  const [modal, setModal] = useState<{ kind: "expense"; expense?: Expense } | { kind: "transfer"; transfer?: Transfer } | { kind: "payment"; id: string } | null>(null);
  const [error, setError] = useState("");

  const saleOf = (id: string) => data.sales.find((s) => s.id === id);
  const orderName = (id?: string) => data.orders.find((o) => o.id === id)?.name;

  const describe = (m: Movement) => {
    if (m.kind === "payment") {
      const s = saleOf(m.saleId);
      const name = s?.customer.name ?? "cliente";
      if (m.method === "avoir")
        return { title: `Avoir de ${name} (${m.amount < 0 ? "utilisé" : "reçu"})`, sub: "Aucun argent ne bouge", sign: 0, people: [m.receivedBy] as string[] };
      return {
        title: m.amount < 0 ? `Remboursement à ${name}` : `Paiement de ${name}`,
        sub: `${METHODS[m.method]} · ${m.amount < 0 ? "rendu" : "reçu"} par ${PARTNER_NAMES[m.receivedBy]}`,
        sign: m.amount < 0 ? -1 : 1,
        people: [m.receivedBy] as string[],
      };
    }
    if (m.kind === "expense")
      return {
        title: m.label,
        sub: `${CATEGORIES[m.category]}${m.orderId ? ` · ${orderName(m.orderId)}` : ""} · ${m.amount < 0 ? "reçu" : "payé"} par ${PAYER_NAMES[m.paidBy]}${m.via ? ` (chez ${PARTNER_NAMES[m.via]})` : ""}`,
        sign: m.amount < 0 ? 1 : -1,
        people: [m.paidBy, m.via ?? ""],
      };
    return {
      title: m.label || "Mouvement interne",
      sub: `${PAYER_NAMES[m.from]} → ${PAYER_NAMES[m.to]}`,
      sign: 0,
      people: [m.from, m.to],
    };
  };

  const months = [...new Set(data.moves.map((m) => m.date.slice(0, 7)))].sort().reverse();
  const rows = data.moves
    .filter((m) => (!kind || m.kind === kind) && (!month || m.date.startsWith(month)) && (!who || describe(m).people.includes(who)))
    .sort((x, y) => y.date.localeCompare(x.date));

  const byCategory = (Object.keys(CATEGORIES) as Category[])
    .map((c) => [c, data.moves.filter((m): m is Expense => m.kind === "expense" && m.category === c).reduce((s, e) => s + e.amount, 0)] as const)
    .filter(([, v]) => v > 0);

  const del = async (m: Movement) => {
    if (!window.confirm("Supprimer ce mouvement ?")) return;
    try {
      await call("move.delete", { id: m.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  };

  const edit = (m: Movement) =>
    m.kind === "expense" ? setModal({ kind: "expense", expense: m }) : m.kind === "transfer" ? setModal({ kind: "transfer", transfer: m }) : setModal({ kind: "payment", id: m.id });

  const editedPayment = modal?.kind === "payment" ? data.moves.find((m) => m.id === modal.id) : undefined;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-[1fr_1.4fr]">
        <div className={`rounded-xl border p-4 ${a.totals.caisse < 0 ? "border-wine bg-white" : "border-plum bg-white"}`}>
          <p className="text-sm text-muted">Caisse Aurahair (argent des ventes)</p>
          <p className={`font-display text-3xl font-bold ${a.totals.caisse < 0 ? "text-wine" : "text-plum"}`}>{F(a.totals.caisse)}</p>
          <p className="mt-2 text-xs text-muted">
            Paiements des clientes, moins ce que la caisse a payé et ce que vous en avez retiré.
            {a.totals.caisse < 0 && " Négatif : des ventes ne sont pas encore enregistrées."}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 text-sm">
          <p className="font-semibold text-plum">Où est l&apos;argent de la caisse</p>
          <ul className="mt-2 space-y-1">
            {PARTNERS.map((p) => (
              <li key={p} className="flex justify-between">
                <span>Chez {PARTNER_NAMES[p]}</span>
                <span className="tabular-nums">{F(a.holdings[p])}</span>
              </li>
            ))}
            {a.holdings.inconnu !== 0 && (
              <li className="flex justify-between text-muted">
                <span>Sorties de caisse sans personne précisée</span>
                <span className="tabular-nums">{F(a.holdings.inconnu)}</span>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Btn onClick={() => setModal({ kind: "expense" })}>Ajouter une dépense</Btn>
        <Btn kind="secondary" onClick={() => setModal({ kind: "transfer" })}>
          Mouvement entre vous ou avec la caisse
        </Btn>
        <Btn kind="secondary" onClick={() => go("echeances")}>
          Encaisser une cliente
        </Btn>
      </div>

      {byCategory.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-bold text-plum">Dépenses par type</h2>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {byCategory.map(([c, v]) => (
              <li key={c} className="flex justify-between rounded-lg border border-line bg-white p-3 text-sm">
                <span>{CATEGORIES[c]}</span>
                <span className="font-semibold tabular-nums">{F(v)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="font-display text-xl font-bold text-plum">Toutes les entrées et sorties</h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <select aria-label="Type de mouvement" value={kind} onChange={(e) => setKind(e.target.value as Kind)} className={input}>
            <option value="">Tous les mouvements</option>
            <option value="payment">Entrées (paiements des clientes)</option>
            <option value="expense">Sorties (dépenses)</option>
            <option value="transfer">Mouvements internes</option>
          </select>
          <select aria-label="Personne" value={who} onChange={(e) => setWho(e.target.value)} className={input}>
            <option value="">Tout le monde</option>
            {PARTNERS.map((p) => (
              <option key={p} value={p}>
                {PARTNER_NAMES[p]}
              </option>
            ))}
            <option value="caisse">Caisse</option>
          </select>
          <select aria-label="Mois" value={month} onChange={(e) => setMonth(e.target.value)} className={input}>
            <option value="">Tous les mois</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}-15T12:00:00Z`))}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="mt-2 text-sm font-semibold text-wine">{error}</p>}
        {rows.length ? (
          <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-white">
            {rows.map((m) => {
              const d = describe(m);
              return (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold text-plum">{d.title}</span>
                    <span className="block text-xs text-muted">
                      {fmtDate(m.date)} · {d.sub}
                      {m.note ? ` · ${m.note}` : ""}
                    </span>
                  </span>
                  <span className={`font-semibold tabular-nums ${d.sign > 0 ? "text-whatsapp" : d.sign < 0 ? "text-wine" : "text-muted"}`}>
                    {d.sign === 0 ? F(Math.abs(m.amount)) : signed(d.sign * Math.abs(m.amount))}
                  </span>
                  {"returnId" in m && m.returnId ? (
                    <Btn kind="link" onClick={() => go("retours")}>
                      Voir le retour
                    </Btn>
                  ) : (
                    <span className="flex gap-3">
                      {!(m.kind === "payment" && (m.method === "avoir" || m.amount < 0)) && (
                        <Btn kind="link" onClick={() => edit(m)}>
                          Modifier
                        </Btn>
                      )}
                      <Btn kind="link" className="text-wine" onClick={() => del(m)}>
                        Supprimer
                      </Btn>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-3">
            <Empty>Aucun mouvement pour ces filtres.</Empty>
          </div>
        )}
      </section>

      {modal?.kind === "expense" && <ExpenseForm expense={modal.expense} onClose={() => setModal(null)} />}
      {modal?.kind === "transfer" && <TransferForm transfer={modal.transfer} onClose={() => setModal(null)} />}
      {editedPayment?.kind === "payment" && saleOf(editedPayment.saleId) && (
        <PaymentForm sale={saleOf(editedPayment.saleId)!} payment={editedPayment} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

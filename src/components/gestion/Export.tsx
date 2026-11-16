"use client";

import { invoiceNumber, ITEM_STATE, returnNumber, SALE_STATUS } from "@/lib/gestion/compute";
import {
  CATEGORIES,
  METHODS,
  PARTNER_NAMES,
  PAYER_NAMES,
  RETURN_OUTCOMES,
  RETURN_SOLUTIONS,
  SUPPLIER_CLAIMS,
} from "@/lib/gestion/types";
import { Btn, useG } from "./ui";

type Cell = string | number | undefined;

/** CSV that Excel opens directly in French settings: semicolons, UTF-8 with BOM. */
function download(name: string, header: string[], rows: Cell[][]) {
  const cell = (v: Cell) => {
    const s = v === undefined ? "" : String(v);
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = "﻿" + [header, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `aurahair-${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Exports the management data as files Excel can open. */
export default function Export() {
  const { data, a } = useG();
  const orderName = (id?: string) => data.orders.find((o) => o.id === id)?.name ?? "";
  const label = (id?: string) => data.items.find((i) => i.id === id)?.label ?? "";

  const exports: [string, string, () => void][] = [
    [
      "Ventes",
      "Une ligne par article vendu, avec sa commande d'origine.",
      () =>
        download(
          "ventes",
          ["Facture", "Date", "Cliente", "Téléphone", "Article", "Commande", "Prix", "Retournée", "Total vente", "Payé", "Reste", "Statut", "Coût de revient", "Marge vente"],
          [...a.saleInfo.values()].flatMap((s) =>
            s.sale.lines.map((l) => [
              invoiceNumber(s.sale),
              s.sale.date,
              s.sale.customer.name,
              s.sale.customer.phone,
              label(l.itemId),
              orderName(data.items.find((i) => i.id === l.itemId)?.orderId),
              l.price,
              l.returned ? "oui" : "",
              s.total,
              s.paid,
              Math.max(0, s.remaining),
              SALE_STATUS[s.status],
              s.cost,
              s.margin,
            ]),
          ),
        ),
    ],
    [
      "Entrées et sorties",
      "Tous les paiements, dépenses et mouvements entre vous.",
      () =>
        download(
          "mouvements",
          ["Date", "Type", "Description", "Catégorie", "Commande", "Qui", "Entrée", "Sortie", "Note"],
          [...data.moves]
            .sort((x, y) => x.date.localeCompare(y.date))
            .map((m) => {
              if (m.kind === "payment") {
                const s = data.sales.find((x) => x.id === m.saleId);
                return [m.date, m.method === "avoir" ? "Avoir" : m.amount < 0 ? "Remboursement cliente" : "Paiement cliente", s ? `${s.customer.name} (${invoiceNumber(s)})` : "", METHODS[m.method], "", PARTNER_NAMES[m.receivedBy], m.amount > 0 ? m.amount : "", m.amount < 0 ? -m.amount : "", m.note];
              }
              if (m.kind === "expense")
                return [m.date, m.amount < 0 ? "Remboursement reçu" : "Dépense", m.label, CATEGORIES[m.category], orderName(m.orderId), PAYER_NAMES[m.paidBy], m.amount < 0 ? -m.amount : "", m.amount > 0 ? m.amount : "", m.note];
              return [m.date, "Mouvement interne", m.label ?? "", "", "", `${PAYER_NAMES[m.from]} → ${PAYER_NAMES[m.to]}`, "", "", `${m.amount}${m.note ? ` · ${m.note}` : ""}`];
            }),
        ),
    ],
    [
      "Stock",
      "Tous les articles avec coût de revient, prix visé et état.",
      () =>
        download(
          "stock",
          ["Article", "Commande", "Prix fournisseur ($)", "Coût de revient", "Prix visé", "Prix minimum", "État", "Vendu à", "Note"],
          [...a.itemInfo.values()].map((i) => [i.item.label, i.order?.name ?? "", i.item.costUsd, i.cost, i.item.price, i.item.minPrice, ITEM_STATE[i.state], i.soldPrice, i.item.note]),
        ),
    ],
    [
      "Retours",
      "Les perruques défectueuses et leur suivi.",
      () =>
        download(
          "retours",
          ["Retour", "Date", "Article", "Origine", "Cliente", "Défaut", "Solution", "Devenir", "Réclamation", "Terminé"],
          data.returns.map((r) => [
            returnNumber(r),
            r.date,
            label(r.itemId),
            r.origin === "cliente" ? "Cliente" : "Stock",
            data.sales.find((s) => s.id === r.saleId)?.customer.name,
            r.problem,
            r.solution ? RETURN_SOLUTIONS[r.solution] : "",
            RETURN_OUTCOMES[r.outcome],
            SUPPLIER_CLAIMS[r.claim],
            r.closed ? "oui" : "non",
          ]),
        ),
    ],
  ];

  return (
    <section>
      <h2 className="font-display text-2xl font-bold text-plum">Exporter pour Excel</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {exports.map(([title, text, run]) => (
          <div key={title} className="flex flex-col justify-between gap-3 rounded-xl border border-line bg-white p-4 text-sm">
            <div>
              <p className="font-semibold text-plum">{title}</p>
              <p className="text-xs text-muted">{text}</p>
            </div>
            <Btn kind="secondary" onClick={run}>
              Télécharger
            </Btn>
          </div>
        ))}
      </div>
    </section>
  );
}

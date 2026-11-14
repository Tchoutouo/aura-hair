"use client";

import { useState } from "react";
import { addDays, fmtDate, invoiceNumber, today, type SaleInfo } from "@/lib/gestion/compute";
import type { Sale } from "@/lib/gestion/types";
import { PaymentForm } from "./forms";
import { WhatsAppActions } from "./Sales";
import { Btn, Empty, F, useG } from "./ui";

function DueRow({ info, onPay }: { info: SaleInfo; onPay: (s: Sale) => void }) {
  const { go } = useG();
  const s = info.sale;
  const last = s.reminders[s.reminders.length - 1];
  return (
    <li className="space-y-3 p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button type="button" onClick={() => go("ventes", { openSale: s.id })} className="font-semibold text-plum underline-offset-2 hover:underline">
            {s.customer.name}
          </button>
          <p className="text-xs text-muted">
            {invoiceNumber(s)} · {s.customer.phone || "pas de téléphone"}
            {last ? ` · relancée le ${fmtDate(today(new Date(last)))}` : " · jamais relancée"}
          </p>
        </div>
        <div className="text-right">
          {info.overdue > 0 ? (
            <p className="font-semibold text-wine">{F(info.overdue)} en retard</p>
          ) : (
            info.next && (
              <p className="font-semibold text-plum">
                {F(info.next.amount)} le {fmtDate(info.next.date)}
              </p>
            )
          )}
          <p className="text-xs text-muted">reste au total {F(info.remaining)}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Btn onClick={() => onPay(s)}>Encaisser</Btn>
        <WhatsAppActions info={info} />
      </div>
    </li>
  );
}

export default function Dues() {
  const { a } = useG();
  const [paying, setPaying] = useState<Sale | null>(null);
  const week = addDays(a.on, 7);
  const groups: [string, SaleInfo[]][] = [
    ["En retard", a.dues.filter((d) => d.overdue > 0)],
    ["Dans les 7 jours", a.dues.filter((d) => d.overdue <= 0 && d.next && d.next.date <= week)],
    ["Plus tard", a.dues.filter((d) => d.overdue <= 0 && (!d.next || d.next.date > week))],
  ];

  if (!a.dues.length) return <Empty>Aucune cliente ne vous doit d&apos;argent. Tout est encaissé.</Empty>;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Total à encaisser : <strong className="text-plum">{F(a.totals.receivable)}</strong>
        {a.totals.overdue > 0 && (
          <>
            , dont <strong className="text-wine">{F(a.totals.overdue)} en retard</strong>
          </>
        )}
        . Le bouton « Relancer » ouvre WhatsApp avec un message prêt ; vous n&apos;avez plus qu&apos;à l&apos;envoyer.
      </p>
      {groups.map(
        ([title, list]) =>
          list.length > 0 && (
            <section key={title}>
              <h2 className={`font-display text-xl font-bold ${title === "En retard" ? "text-wine" : "text-plum"}`}>
                {title} ({list.length})
              </h2>
              <ul className="mt-2 divide-y divide-line rounded-xl border border-line bg-white">
                {list.map((d) => (
                  <DueRow key={d.sale.id} info={d} onPay={setPaying} />
                ))}
              </ul>
            </section>
          ),
      )}
      {paying && <PaymentForm sale={paying} onClose={() => setPaying(null)} />}
    </div>
  );
}

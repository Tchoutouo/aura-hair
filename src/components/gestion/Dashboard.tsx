"use client";

import { useState } from "react";
import { Btn, Empty, F, Stat, useG } from "./ui";

const pct = (x: number) => `${Math.round(x * 100)} %`;
const monthName = (m: string) =>
  new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}-15T12:00:00Z`));

function ImportPanel() {
  const { call } = useG();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="rounded-2xl border-2 border-plum bg-white p-6">
      <h2 className="font-display text-2xl font-bold text-plum">Commencer</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Importez vos 4 commandes d&apos;avant le site : 43 perruques, les paiements de chacun, les transports, le règlement
        de 15 725 F et les 3 ventes encaissées par Lisa. Les dates n&apos;étaient pas dans vos fichiers : elles seront à
        corriger.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Btn
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await call("seed");
            } catch (e) {
              setError(e instanceof Error ? e.message : "Erreur");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Import…" : "Importer mes 4 commandes"}
        </Btn>
        {error && <span className="text-sm font-semibold text-wine">{error}</span>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data, a, go } = useG();
  const t = a.totals;

  if (!data.orders.length && !data.sales.length && !data.moves.length) return <ImportPanel />;

  const late = a.dues.filter((d) => d.overdue > 0);
  const maxMonth = Math.max(1, ...a.monthly.map((m) => Math.max(m.in, m.out)));

  return (
    <div className="space-y-8">
      {(late.length > 0 || t.caisse < 0 || t.openReturns > 0) && (
        <div className="space-y-2">
          {late.length > 0 && (
            <p className="rounded-xl bg-wine p-4 text-sm text-white">
              {late.length} cliente{late.length > 1 ? "s ont" : " a"} un paiement en retard, pour {F(t.overdue)}.{" "}
              <button type="button" onClick={() => go("echeances")} className="font-semibold underline">
                Voir les échéances et relancer
              </button>
            </p>
          )}
          {t.openReturns > 0 && (
            <p className="rounded-xl border border-line bg-white p-4 text-sm">
              {t.openReturns} retour{t.openReturns > 1 ? "s" : ""} de perruque défectueuse en cours.{" "}
              <button type="button" onClick={() => go("retours")} className="font-semibold underline">
                Voir les retours
              </button>
            </p>
          )}
          {t.caisse < 0 && (
            <p className="rounded-xl border border-gold bg-gold-soft p-4 text-sm">
              La caisse est à <strong>{F(t.caisse)}</strong> : elle a payé plus que les ventes enregistrées. Il manque
              probablement des ventes à saisir.{" "}
              <button type="button" onClick={() => go("caisse")} className="font-semibold underline">
                Voir la caisse
              </button>
            </p>
          )}
        </div>
      )}

      <section>
        <h2 className="font-display text-2xl font-bold text-plum">Ventes</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Chiffre d'affaires" value={F(t.revenue)} sub={`${t.soldCount} article${t.soldCount > 1 ? "s" : ""} vendu${t.soldCount > 1 ? "s" : ""}`} />
          <Stat label="Encaissé" value={F(t.received)} />
          <Stat label="Reste à encaisser" value={F(t.receivable)} sub={t.overdue ? `dont ${F(t.overdue)} en retard` : "Aucun retard"} tone={t.overdue ? "bad" : undefined} />
          <Stat label="Marge brute" value={F(t.grossMargin)} sub={t.revenue ? `${pct(t.grossMargin / t.revenue)} du chiffre d'affaires` : undefined} tone={t.grossMargin >= 0 ? "good" : "bad"} />
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl font-bold text-plum">Argent et stock</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total investi" value={F(t.invested)} sub={`Commandes ${F(t.investedOrders)}, autres dépenses ${F(t.general)}`} />
          <Stat label="Investissement récupéré" value={pct(t.recovered)} sub={`${F(t.received)} encaissés sur ${F(t.invested)}`} />
          <Stat
            label="Bénéfice net à ce jour"
            value={F(t.netProfit)}
            sub={`Marge brute moins les dépenses générales${t.losses ? ` et ${F(t.losses)} de pertes` : ""}`}
            tone={t.netProfit >= 0 ? "good" : "bad"}
          />
          <Stat
            label={`Stock : ${t.stockCount} article${t.stockCount > 1 ? "s" : ""}`}
            value={F(t.stockCost)}
            sub={`Valeur de vente visée ${F(t.stockValue)}${t.stockUnpriced ? ` (${t.stockUnpriced} sans prix)` : ""}${t.savCount ? `. ${t.savCount} en SAV` : ""}`}
          />
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl font-bold text-plum">Entrées et sorties par mois</h2>
        {a.monthly.length ? (
          <div className="mt-3 space-y-4 rounded-xl border border-line bg-white p-4">
            <p className="flex gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-4 rounded-sm bg-whatsapp" /> Entrées (paiements des clientes)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-4 rounded-sm bg-wine" /> Sorties (commandes et dépenses)
              </span>
            </p>
            {a.monthly.map((m) => (
              <div key={m.month} className="grid gap-1 text-sm sm:grid-cols-[9rem_1fr]">
                <span className="font-semibold capitalize text-plum">{monthName(m.month)}</span>
                <div className="space-y-1">
                  {(
                    [
                      ["in", m.in, "bg-whatsapp"],
                      ["out", m.out, "bg-wine"],
                    ] as const
                  ).map(([k, v, color]) => (
                    <div key={k} className="flex items-center gap-2">
                      <div className="h-3 flex-1 rounded-sm bg-sand">
                        <div className={`h-3 rounded-sm ${color}`} style={{ width: `${(v / maxMonth) * 100}%` }} />
                      </div>
                      <span className="w-28 shrink-0 text-right text-xs tabular-nums">
                        {k === "in" ? "+" : "−"} {F(v)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty>Aucun mouvement d&apos;argent pour l&apos;instant.</Empty>
        )}
      </section>

      <section>
        <h2 className="font-display text-2xl font-bold text-plum">Par commande</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-sand text-left text-xs text-muted">
              <tr>
                <th className="p-3">Commande</th>
                <th className="p-3 text-right">Coût total</th>
                <th className="p-3 text-right">Vendus</th>
                <th className="p-3 text-right">Chiffre d&apos;affaires</th>
                <th className="p-3 text-right">Encaissé</th>
                <th className="p-3 text-right">Marge</th>
                <th className="p-3 text-right">Récupéré</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[...a.orderInfo.values()].map((o) => (
                <tr key={o.order.id} className="cursor-pointer hover:bg-ivory" onClick={() => go("commandes", { openOrder: o.order.id })}>
                  <td className="p-3 font-semibold text-plum">{o.order.name}</td>
                  <td className="p-3 text-right tabular-nums">{F(o.total)}</td>
                  <td className="p-3 text-right tabular-nums">
                    {o.sold} / {o.items.length}
                  </td>
                  <td className="p-3 text-right tabular-nums">{F(o.revenue)}</td>
                  <td className="p-3 text-right tabular-nums">{F(o.received)}</td>
                  <td className={`p-3 text-right tabular-nums ${o.margin < 0 ? "text-wine" : ""}`}>{F(o.margin)}</td>
                  <td className="p-3 text-right tabular-nums">{o.total ? pct(o.received / o.total) : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {a.customers.length > 0 && (
        <section>
          <h2 className="font-display text-2xl font-bold text-plum">Clientes</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-white">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-sand text-left text-xs text-muted">
                <tr>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Téléphone</th>
                  <th className="p-3 text-right">Articles</th>
                  <th className="p-3 text-right">Achats</th>
                  <th className="p-3 text-right">Reste à payer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {a.customers.map((c) => (
                  <tr key={`${c.name}-${c.phone}`}>
                    <td className="p-3 font-semibold text-plum">{c.name}</td>
                    <td className="p-3">{c.phone || "–"}</td>
                    <td className="p-3 text-right tabular-nums">{c.count}</td>
                    <td className="p-3 text-right tabular-nums">{F(c.total)}</td>
                    <td className={`p-3 text-right tabular-nums ${c.remaining ? "font-semibold text-wine" : ""}`}>{F(c.remaining)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

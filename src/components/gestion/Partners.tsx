"use client";

import { useState } from "react";
import { CATEGORIES, PARTNER_NAMES, PARTNERS, type Category, type Expense, type Partner } from "@/lib/gestion/types";
import { TransferForm } from "./forms";
import { Btn, F, useG } from "./ui";

export default function Partners() {
  const { data, a } = useG();
  const [settling, setSettling] = useState(false);
  const [withdraw, setWithdraw] = useState<Partner | null>(null);
  const s = a.settlement;

  const apportsBy = (p: Partner) => {
    const map = new Map<Category, number>();
    for (const m of data.moves)
      if (m.kind === "expense" && m.paidBy === p) map.set(m.category, (map.get(m.category) ?? 0) + (m as Expense).amount);
    return [...map.entries()];
  };

  return (
    <div className="space-y-6">
      <div className={`rounded-2xl p-5 ${s ? "border-2 border-wine bg-white" : "bg-plum text-gold-soft"}`}>
        {s ? (
          <>
            <p className="font-display text-2xl font-bold text-plum">
              Pour être à égalité, {PARTNER_NAMES[s.from]} verse {F(s.amount)} à {PARTNER_NAMES[s.to]}.
            </p>
            <p className="mt-1 text-sm text-muted">
              {PARTNER_NAMES[s.to]} a mis {F(s.amount * 2)} de plus que {PARTNER_NAMES[s.from]} de sa poche : la différence se
              partage en deux, soit {F(s.amount)}.
            </p>
            <Btn className="mt-3" onClick={() => setSettling(true)}>
              Enregistrer ce règlement
            </Btn>
          </>
        ) : (
          <>
            <p className="font-display text-2xl font-bold text-white">Vous êtes à égalité.</p>
            <p className="mt-1 text-sm">Lisa et Yvaltt ont mis exactement la même somme de leur poche dans l&apos;activité.</p>
          </>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {PARTNERS.map((p) => {
          const x = a.partners[p];
          const other = PARTNER_NAMES[p === "yvaltt" ? "lisa" : "yvaltt"];
          return (
            <section key={p} className="rounded-2xl border border-line bg-white p-5">
              <h2 className="font-display text-2xl font-bold text-plum">{PARTNER_NAMES[p]}</h2>
              <p className="mt-1 text-sm text-muted">Apport net de sa poche</p>
              <p className="font-display text-3xl font-bold text-plum">{F(x.net)}</p>
              <dl className="mt-4 space-y-1 text-sm">
                {apportsBy(p).map(([c, v]) => (
                  <div key={c} className="flex justify-between">
                    <dt>{CATEGORIES[c]}</dt>
                    <dd className="tabular-nums">{F(v)}</dd>
                  </div>
                ))}
                {x.deposits > 0 && (
                  <div className="flex justify-between">
                    <dt>Mis dans la caisse</dt>
                    <dd className="tabular-nums">{F(x.deposits)}</dd>
                  </div>
                )}
                {x.withdrawals > 0 && (
                  <div className="flex justify-between">
                    <dt>Retiré de la caisse</dt>
                    <dd className="tabular-nums">− {F(x.withdrawals)}</dd>
                  </div>
                )}
                {x.givenToPartner > 0 && (
                  <div className="flex justify-between">
                    <dt>Versé à {other}</dt>
                    <dd className="tabular-nums">{F(x.givenToPartner)}</dd>
                  </div>
                )}
                {x.receivedFromPartner > 0 && (
                  <div className="flex justify-between">
                    <dt>Reçu de {other}</dt>
                    <dd className="tabular-nums">− {F(x.receivedFromPartner)}</dd>
                  </div>
                )}
              </dl>
              <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
                Argent des ventes reçu (pour la caisse) : {F(x.collected)}. Il appartient à vous deux et ne compte pas dans
                l&apos;apport.
              </p>
              <Btn kind="secondary" className="mt-3" onClick={() => setWithdraw(p)}>
                Retirer de la caisse
              </Btn>
            </section>
          );
        })}
      </div>

      <section className="rounded-xl bg-sand p-5 text-sm leading-relaxed">
        <h2 className="font-display text-xl font-bold text-plum">Comment les comptes sont faits</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Tout est partagé à moitié : commandes, transport, accessoires, autres dépenses, et les bénéfices.</li>
          <li>Quand Lisa ou Yvaltt paie de sa poche, c&apos;est son apport. Quand la caisse (l&apos;argent des ventes) paie, ça ne compte pour personne.</li>
          <li>L&apos;argent des ventes va dans la caisse, même si c&apos;est Lisa ou Yvaltt qui le reçoit sur son téléphone.</li>
          <li>Pour vous partager un bénéfice, enregistrez un « retrait de la caisse » du même montant pour Lisa et pour Yvaltt.</li>
        </ul>
      </section>

      {settling && s && <TransferForm preset={{ from: s.from, to: s.to, amount: s.amount, label: "Règlement entre associés" }} onClose={() => setSettling(false)} />}
      {withdraw && <TransferForm preset={{ from: "caisse", to: withdraw, label: "Retrait de la caisse" }} onClose={() => setWithdraw(null)} />}
    </div>
  );
}

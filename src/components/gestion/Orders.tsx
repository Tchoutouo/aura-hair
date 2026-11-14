"use client";

import { useEffect, useState } from "react";
import { fmtDate, ITEM_STATE } from "@/lib/gestion/compute";
import { CATEGORIES, PAYER_NAMES, type Expense, type Item, type Order } from "@/lib/gestion/types";
import { ExpenseForm, ItemForm, ItemsAddForm, OrderForm } from "./forms";
import { Badge, Btn, Empty, F, useG } from "./ui";

export const stateTone = (s: string) => (s === "vendu" ? "good" : s === "vendu_encours" ? "warn" : s === "reserve" ? "plum" : "neutral") as "good" | "warn" | "plum" | "neutral";

function OrderDetail({ order, onBack }: { order: Order; onBack: () => void }) {
  const { a, call, go } = useG();
  const info = a.orderInfo.get(order.id);
  const [modal, setModal] = useState<
    { kind: "edit" } | { kind: "items" } | { kind: "item"; item: Item } | { kind: "expense"; expense?: Expense; category?: Expense["category"] } | null
  >(null);
  const [error, setError] = useState("");
  if (!info) return null;
  const del = async () => {
    if (!window.confirm(`Supprimer ${order.name} et ses articles ?`)) return;
    try {
      await call("order.delete", { id: order.id });
      onBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Btn kind="link" onClick={onBack}>
            Toutes les commandes
          </Btn>
          <h2 className="mt-1 font-display text-3xl font-bold text-plum">{order.name}</h2>
          <p className="text-sm text-muted">
            {fmtDate(order.date)} · {order.supplier || "Fournisseur non précisé"} · 1 $ = {order.rate} F
          </p>
          {order.note && <p className="mt-1 max-w-2xl text-sm">{order.note}</p>}
        </div>
        <div className="flex gap-2">
          <Btn kind="secondary" onClick={() => setModal({ kind: "edit" })}>
            Modifier
          </Btn>
          <Btn kind="danger" onClick={del}>
            Supprimer
          </Btn>
        </div>
      </div>
      {error && <p className="text-sm font-semibold text-wine">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-line bg-white p-4 text-sm">
          <p className="text-muted">Facture fournisseur</p>
          <p className="mt-1 font-semibold text-plum">
            {info.itemsUsd.toLocaleString("fr-FR")} $ {order.discountUsd ? `− ${order.discountUsd} $ de remise` : ""}
          </p>
          <p className="text-muted">≈ {F(info.estimatedSupplier)} au taux de {order.rate}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 text-sm">
          <p className="text-muted">Payé au fournisseur</p>
          <p className="mt-1 font-display text-2xl font-bold text-plum">{F(info.supplierPaid)}</p>
          {order.settled ? (
            <Badge tone="good">Entièrement payé</Badge>
          ) : info.supplierDue > 0 ? (
            <Badge tone="bad">Reste environ {F(info.supplierDue)}</Badge>
          ) : (
            <Badge tone="warn">À confirmer comme payé</Badge>
          )}
        </div>
        <div className="rounded-xl border border-line bg-white p-4 text-sm">
          <p className="text-muted">Transport et frais</p>
          <p className="mt-1 font-display text-2xl font-bold text-plum">{F(info.otherCosts)}</p>
        </div>
        <div className="rounded-xl border border-plum bg-white p-4 text-sm">
          <p className="text-muted">Coût total de la commande</p>
          <p className="mt-1 font-display text-2xl font-bold text-plum">{F(info.total)}</p>
          <p className="text-muted">
            {info.sold} / {info.items.length} vendus · marge {F(info.margin)}
          </p>
        </div>
      </div>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-xl font-bold text-plum">Paiements et frais de la commande</h3>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => setModal({ kind: "expense", category: "fournisseur" })}>Paiement fournisseur</Btn>
            <Btn kind="secondary" onClick={() => setModal({ kind: "expense", category: "transport" })}>
              Transport ou frais
            </Btn>
          </div>
        </div>
        {info.expenses.length ? (
          <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-white">
            {info.expenses.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <span>
                  <span className="font-semibold text-plum">{e.label}</span>
                  <span className="block text-xs text-muted">
                    {CATEGORIES[e.category]} · payé par {PAYER_NAMES[e.paidBy]} · {fmtDate(e.date)}
                    {e.itemId && " · pour un seul article"}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-semibold tabular-nums">{F(e.amount)}</span>
                  <Btn kind="link" onClick={() => setModal({ kind: "expense", expense: e })}>
                    Modifier
                  </Btn>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3">
            <Empty>Ajoutez qui a payé le fournisseur et combien, puis le transport.</Empty>
          </div>
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-xl font-bold text-plum">Articles ({info.items.length})</h3>
          <Btn onClick={() => setModal({ kind: "items" })}>Ajouter des articles</Btn>
        </div>
        <p className="mt-1 text-xs text-muted">
          Le coût de revient répartit le coût total de la commande selon le prix fournisseur de chaque article (une perruque
          longue coûte plus cher et pèse plus lourd au transport).
        </p>
        {info.items.length ? (
          <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-white">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-sand text-left text-xs text-muted">
                <tr>
                  <th className="p-3">Article</th>
                  <th className="p-3 text-right">Prix fournisseur</th>
                  <th className="p-3 text-right">Coût de revient</th>
                  <th className="p-3 text-right">Prix visé</th>
                  <th className="p-3">État</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {info.items.map((it) => {
                  const ii = a.itemInfo.get(it.id)!;
                  return (
                    <tr key={it.id}>
                      <td className="p-3">
                        <span className="font-semibold text-plum">{it.label}</span>
                        {it.note && <span className="block text-xs text-muted">{it.note}</span>}
                      </td>
                      <td className="p-3 text-right tabular-nums">{it.costUsd} $</td>
                      <td className="p-3 text-right tabular-nums">{F(ii.cost)}</td>
                      <td className="p-3 text-right tabular-nums">{it.price ? F(it.price) : "–"}</td>
                      <td className="p-3">
                        <Badge tone={stateTone(ii.state)}>{ITEM_STATE[ii.state]}</Badge>
                        {ii.soldPrice !== undefined && <span className="block text-xs text-muted">vendue {F(ii.soldPrice)}</span>}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        {ii.sale ? (
                          <Btn kind="link" onClick={() => go("ventes", { openSale: ii.sale!.id })}>
                            Voir la vente
                          </Btn>
                        ) : (
                          <span className="flex justify-end gap-3">
                            <Btn kind="link" onClick={() => go("ventes", { sellItem: it.id })}>
                              Vendre
                            </Btn>
                            <Btn kind="link" onClick={() => setModal({ kind: "item", item: it })}>
                              Modifier
                            </Btn>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-3">
            <Empty>Ajoutez les articles de la facture du fournisseur, une ligne par perruque.</Empty>
          </div>
        )}
      </section>

      {modal?.kind === "edit" && <OrderForm order={order} onClose={() => setModal(null)} />}
      {modal?.kind === "items" && <ItemsAddForm orderId={order.id} onClose={() => setModal(null)} />}
      {modal?.kind === "item" && <ItemForm item={modal.item} onClose={() => setModal(null)} />}
      {modal?.kind === "expense" && (
        <ExpenseForm
          expense={modal.expense}
          preset={{ orderId: order.id, category: modal.category, label: modal.category === "fournisseur" ? `Paiement ${order.name}` : modal.category === "transport" ? `Transport ${order.name}` : "" }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

export default function Orders() {
  const { data, a, intent, clearIntent } = useG();
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (intent?.openOrder) {
      setOpen(intent.openOrder);
      clearIntent();
    }
  }, [intent, clearIntent]);

  const order = data.orders.find((o) => o.id === open);
  if (order) return <OrderDetail order={order} onBack={() => setOpen(null)} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Chaque commande à un fournisseur, avec ses articles, ses paiements et son transport.</p>
        <Btn onClick={() => setCreating(true)}>Nouvelle commande</Btn>
      </div>
      {data.orders.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[...data.orders].reverse().map((o) => {
            const info = a.orderInfo.get(o.id)!;
            return (
              <button key={o.id} type="button" onClick={() => setOpen(o.id)} className="rounded-xl border border-line bg-white p-4 text-left hover:border-plum">
                <span className="flex items-start justify-between gap-2">
                  <span className="font-display text-xl font-bold text-plum">{o.name}</span>
                  {!o.settled && info.supplierDue > 0 && <Badge tone="bad">Fournisseur à payer</Badge>}
                </span>
                <span className="block text-sm text-muted">
                  {fmtDate(o.date)} · {o.supplier} · 1 $ = {o.rate} F
                </span>
                <span className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <span>
                    <span className="block text-xs text-muted">Coût total</span>
                    <span className="font-semibold">{F(info.total)}</span>
                  </span>
                  <span>
                    <span className="block text-xs text-muted">Vendus</span>
                    <span className="font-semibold">
                      {info.sold} / {info.items.length}
                    </span>
                  </span>
                  <span>
                    <span className="block text-xs text-muted">Encaissé</span>
                    <span className="font-semibold">{F(info.received)}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <Empty>Aucune commande. Créez la première, ou importez vos commandes depuis le tableau de bord.</Empty>
      )}
      {creating && <OrderForm onClose={() => setCreating(false)} onSaved={(id) => id && setOpen(id)} />}
    </div>
  );
}

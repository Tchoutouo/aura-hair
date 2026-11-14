"use client";

import { useState } from "react";
import { ITEM_STATE, type ItemState } from "@/lib/gestion/compute";
import type { Item } from "@/lib/gestion/types";
import { ItemForm } from "./forms";
import { stateTone } from "./Orders";
import { Badge, Btn, Empty, F, input, useG } from "./ui";

type Filter = "dispo" | "vendu" | "tout" | ItemState;

export default function Stock() {
  const { data, a, go } = useG();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("dispo");
  const [orderId, setOrderId] = useState("");
  const [editing, setEditing] = useState<Item | null>(null);

  const rows = [...a.itemInfo.values()].filter((i) => {
    if (orderId && i.item.orderId !== orderId) return false;
    if (q && !`${i.item.label} ${i.item.note ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === "dispo") return i.state === "stock" || i.state === "reserve";
    if (filter === "vendu") return i.state === "vendu" || i.state === "vendu_encours";
    if (filter === "tout") return true;
    return i.state === filter;
  });
  const cost = rows.reduce((s, i) => s + i.cost, 0);
  const value = rows.reduce((s, i) => s + (i.sale ? i.soldPrice ?? 0 : i.item.price ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input type="search" aria-label="Rechercher un article" placeholder="Rechercher : 16, bouncy, brown…" value={q} onChange={(e) => setQ(e.target.value)} className={input} />
        <select aria-label="État" value={filter} onChange={(e) => setFilter(e.target.value as Filter)} className={input}>
          <option value="dispo">Disponibles (en stock + réservées)</option>
          <option value="stock">En stock</option>
          <option value="reserve">Réservées</option>
          <option value="vendu">Vendues</option>
          <option value="vendu_encours">Vendues, paiement en cours</option>
          <option value="sav">En SAV (défaut)</option>
          <option value="retire">Retirées</option>
          <option value="tout">Tous les articles</option>
        </select>
        <select aria-label="Commande" value={orderId} onChange={(e) => setOrderId(e.target.value)} className={input}>
          <option value="">Toutes les commandes</option>
          {data.orders.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>
      <p className="text-sm text-muted">
        {rows.length} article{rows.length > 1 ? "s" : ""} · coût de revient {F(cost)} · {filter === "vendu" ? "vendus pour" : "valeur visée"} {F(value)}
      </p>
      {rows.length ? (
        <ul className="divide-y divide-line rounded-xl border border-line bg-white">
          {rows.map((i) => (
            <li key={i.item.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-plum">{i.item.label}</p>
                <p className="text-xs text-muted">
                  {i.order?.name} · coût {F(i.cost)}
                  {i.item.price ? ` · prix visé ${F(i.item.price)}` : ""}
                  {i.item.minPrice ? ` (min ${F(i.item.minPrice)})` : ""}
                  {i.sale ? ` · vendue ${F(i.soldPrice ?? 0)} à ${i.sale.customer.name}` : ""}
                  {i.item.note ? ` · ${i.item.note}` : ""}
                  {i.returns.length ? ` · retour ${i.returns.map((r) => `R-${String(r.number).padStart(3, "0")}`).join(", ")}` : ""}
                </p>
              </div>
              <Badge tone={stateTone(i.state)}>{ITEM_STATE[i.state]}</Badge>
              <span className="flex gap-3">
                {i.sale ? (
                  <Btn kind="link" onClick={() => go("ventes", { openSale: i.sale!.id })}>
                    Voir la vente
                  </Btn>
                ) : (
                  <>
                    {i.state !== "retire" && (
                      <Btn kind="primary" onClick={() => go("ventes", { sellItem: i.item.id })}>
                        Vendre
                      </Btn>
                    )}
                    {(i.state === "stock" || i.state === "reserve") && (
                      <Btn kind="link" onClick={() => go("retours", { reportItem: i.item.id })}>
                        Signaler un défaut
                      </Btn>
                    )}
                    <Btn kind="link" onClick={() => setEditing(i.item)}>
                      Modifier
                    </Btn>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>Aucun article ne correspond.</Empty>
      )}
      {editing && <ItemForm item={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

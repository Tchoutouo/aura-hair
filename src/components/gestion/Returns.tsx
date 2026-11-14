"use client";

import { useEffect, useState } from "react";
import { fmtDate, invoiceNumber, returnNumber, today } from "@/lib/gestion/compute";
import {
  METHODS,
  PARTNER_NAMES,
  PARTNERS,
  PAYER_NAMES,
  RETURN_OUTCOMES,
  RETURN_SOLUTIONS,
  SUPPLIER_CLAIMS,
  type Method,
  type Partner,
  type Payer,
  type Return,
  type ReturnOutcome,
  type ReturnSolution,
  type SupplierClaim,
} from "@/lib/gestion/types";
import { Badge, Btn, Empty, F, Field, FormFooter, Modal, input, signed, useG } from "./ui";

const num = (v: string) => (v === "" ? 0 : Number(v));
const OUTCOMES = (Object.keys(RETURN_OUTCOMES) as ReturnOutcome[]).filter((o) => o !== "cliente");

function useRun(onDone: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

function PayerSelect({ value, onChange, withCaisse = true }: { value: string; onChange: (v: string) => void; withCaisse?: boolean }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={input}>
      {PARTNERS.map((p) => (
        <option key={p} value={p}>
          {PARTNER_NAMES[p]}
        </option>
      ))}
      {withCaisse && <option value="caisse">{PAYER_NAMES.caisse}</option>}
    </select>
  );
}

/** Opens a return: a customer bringing back a wig, or a defect found in stock. */
export function ReturnForm({ preset, onClose }: { preset?: { itemId?: string; origin?: Return["origin"] }; onClose: () => void }) {
  const { a, call, me } = useG();
  const items = [...a.itemInfo.values()];
  const presetInfo = preset?.itemId ? a.itemInfo.get(preset.itemId) : undefined;
  const [origin, setOrigin] = useState<Return["origin"]>(preset?.origin ?? (presetInfo?.sale ? "cliente" : "stock"));
  const [itemId, setItemId] = useState(preset?.itemId ?? "");
  const [f, setF] = useState({ date: today(), problem: "", note: "" });
  const [solution, setSolution] = useState<ReturnSolution>("echange");
  const [replacement, setReplacement] = useState("");
  const [outcome, setOutcome] = useState<ReturnOutcome>("attente");
  const [claim, setClaim] = useState<SupplierClaim>("aucune");
  const [refund, setRefund] = useState({ amount: "", method: "momo" as Method, by: me as Partner });
  const [repair, setRepair] = useState({ amount: "", paidBy: me as Payer });
  const { busy, error, run } = useRun(onClose);

  const sold = items.filter((i) => i.sale);
  const inStock = items.filter((i) => i.state === "stock" || i.state === "reserve");
  const choices = origin === "cliente" ? sold : inStock;
  const info = a.itemInfo.get(itemId);
  const si = info?.sale ? a.saleInfo.get(info.sale.id) : undefined;
  const linePrice = info?.soldPrice ?? 0;
  // What the customer will have paid beyond the new total once this line is taken out.
  const creditAfter = si ? Math.max(0, si.paid - Math.max(0, si.total - linePrice)) : 0;
  const keepsIt = origin === "cliente" && (solution === "reparation" || solution === "aucune");
  const repInfo = a.itemInfo.get(replacement);

  useEffect(() => {
    if (origin === "cliente" && solution === "remboursement" && !refund.amount && si)
      setRefund((r) => ({ ...r, amount: String(Math.min(linePrice, Math.max(0, si.paid))) }));
  }, [origin, solution, si, linePrice, refund.amount]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    run(() =>
      call("return.create", {
        ret: { ...f, origin, itemId, solution: origin === "cliente" ? solution : undefined, replacementItemId: replacement, outcome, claim },
        refund: origin === "cliente" && solution === "remboursement" ? { amount: num(refund.amount), method: refund.method, receivedBy: refund.by, date: f.date } : null,
        repair: num(repair.amount) > 0 ? { amount: num(repair.amount), paidBy: repair.paidBy, date: f.date } : null,
      }),
    );
  };

  return (
    <Modal title="Signaler une perruque défectueuse" onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["cliente", "Retour d'une cliente"],
              ["stock", "Défaut constaté en stock"],
            ] as const
          ).map(([o, label]) => (
            <button
              key={o}
              type="button"
              aria-pressed={origin === o}
              onClick={() => {
                setOrigin(o);
                setItemId("");
              }}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold ${origin === o ? "border-plum bg-plum text-gold-soft" : "border-line bg-white text-plum"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
          <Field label={origin === "cliente" ? "Perruque rapportée" : "Article défectueux"}>
            <select required value={itemId} onChange={(e) => setItemId(e.target.value)} className={input}>
              <option value="">Choisir…</option>
              {choices.map((i) => (
                <option key={i.item.id} value={i.item.id}>
                  {i.item.label}
                  {i.sale ? ` – ${i.sale.customer.name}, ${invoiceNumber(i.sale)}` : ` – ${i.order?.name ?? ""}`}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input type="date" required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className={input} />
          </Field>
        </div>
        {info && (
          <p className="text-xs text-muted">
            Provenance : {info.order?.name}
            {info.order?.supplier ? ` (${info.order.supplier})` : ""} · coût de revient {F(info.cost)}
            {si && ` · vendue ${F(linePrice)} à ${si.sale.customer.name}, payé ${F(si.paid)} sur la vente`}
          </p>
        )}

        <Field label="Le défaut" hint="Ce qui ne va pas, et si la cliente a envoyé des photos.">
          <textarea required rows={2} value={f.problem} onChange={(e) => setF({ ...f, problem: e.target.value })} className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm" placeholder="Cheveux qui cassent, closure déchirée, couleur différente…" />
        </Field>

        {origin === "cliente" && (
          <fieldset>
            <legend className="text-sm font-semibold text-rust">Ce que vous proposez à la cliente</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {(Object.keys(RETURN_SOLUTIONS) as ReturnSolution[]).map((s) => (
                <label key={s} className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${solution === s ? "border-plum bg-white" : "border-line"}`}>
                  <input type="radio" name="solution" checked={solution === s} onChange={() => setSolution(s)} />
                  {RETURN_SOLUTIONS[s]}
                </label>
              ))}
            </div>
            {solution === "echange" && (
              <Field label="Article donné en échange" className="mt-3" hint={repInfo && info ? `La vente garde le prix de ${F(linePrice)}. Si l'article d'échange vaut plus, modifiez la vente ensuite.` : undefined}>
                <select required value={replacement} onChange={(e) => setReplacement(e.target.value)} className={input}>
                  <option value="">Choisir dans le stock…</option>
                  {inStock
                    .filter((i) => i.item.id !== itemId)
                    .map((i) => (
                      <option key={i.item.id} value={i.item.id}>
                        {i.item.label}
                        {i.item.price ? ` (${F(i.item.price)})` : ""}
                      </option>
                    ))}
                </select>
              </Field>
            )}
            {solution === "avoir" && info && (
              <p className="mt-3 rounded-lg bg-sand p-3 text-sm">
                La perruque est retirée de la vente. La cliente garde un avoir de <strong>{F(creditAfter)}</strong>, à utiliser sur un prochain achat
                (bouton « Utiliser l&apos;avoir » sur sa vente).
              </p>
            )}
            {solution === "remboursement" && (
              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                <Field label="Montant remboursé (F)" hint={info ? `Payé pour cette vente : ${F(si?.paid ?? 0)}` : undefined}>
                  <input type="number" inputMode="numeric" min="1" required value={refund.amount} onChange={(e) => setRefund({ ...refund, amount: e.target.value })} className={input} />
                </Field>
                <Field label="Moyen">
                  <select value={refund.method} onChange={(e) => setRefund({ ...refund, method: e.target.value as Method })} className={input}>
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
                  <PayerSelect value={refund.by} onChange={(v) => setRefund({ ...refund, by: v as Partner })} withCaisse={false} />
                </Field>
              </div>
            )}
          </fieldset>
        )}

        {(keepsIt ? solution === "reparation" : true) && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Frais de réparation (F, facultatif)" hint="S'ajoutent au coût de cet article.">
              <input type="number" inputMode="numeric" min="0" value={repair.amount} onChange={(e) => setRepair({ ...repair, amount: e.target.value })} className={input} />
            </Field>
            <Field label="Payés par">
              <PayerSelect value={repair.paidBy} onChange={(v) => setRepair({ ...repair, paidBy: v as Payer })} />
            </Field>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {!keepsIt && (
            <Field label="Que devient la perruque défectueuse ?">
              <select value={outcome} onChange={(e) => setOutcome(e.target.value as ReturnOutcome)} className={input}>
                {OUTCOMES.map((o) => (
                  <option key={o} value={o}>
                    {RETURN_OUTCOMES[o]}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Réclamation au fournisseur">
            <select value={claim} onChange={(e) => setClaim(e.target.value as SupplierClaim)} className={input}>
              {(Object.keys(SUPPLIER_CLAIMS) as SupplierClaim[]).map((c) => (
                <option key={c} value={c}>
                  {SUPPLIER_CLAIMS[c]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Note">
          <input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} className={input} />
        </Field>

        <FormFooter busy={busy} error={error} label="Enregistrer le retour" onCancel={onClose} />
      </form>
    </Modal>
  );
}

/** Money linked to a return after it was opened. */
function MoneyForm({ ret, type, onClose }: { ret: Return; type: "fournisseur" | "reparation"; onClose: () => void }) {
  const { call, me } = useG();
  const [f, setF] = useState({ amount: "", who: me as Payer, date: today() });
  const { busy, error, run } = useRun(onClose);
  return (
    <Modal title={type === "fournisseur" ? "Remboursement reçu du fournisseur" : "Frais de réparation"} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => call("return.money", { id: ret.id, type, amount: num(f.amount), who: f.who, date: f.date }));
        }}
        className="grid gap-4 sm:grid-cols-2"
      >
        <Field label="Montant (F)" hint={type === "fournisseur" ? "Au taux reçu. Le coût de l'article baisse d'autant." : "Le coût de l'article augmente d'autant."}>
          <input type="number" inputMode="numeric" min="1" required value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} className={input} />
        </Field>
        <Field label="Date">
          <input type="date" required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className={input} />
        </Field>
        <Field label={type === "fournisseur" ? "Reçu par" : "Payé par"} className="sm:col-span-2">
          <PayerSelect value={f.who} onChange={(v) => setF({ ...f, who: v as Payer })} />
        </Field>
        <div className="sm:col-span-2">
          <FormFooter busy={busy} error={error} label="Enregistrer" onCancel={onClose} />
        </div>
      </form>
    </Modal>
  );
}

function ReturnDetail({ ret, onBack }: { ret: Return; onBack: () => void }) {
  const { data, a, call, go } = useG();
  const info = a.itemInfo.get(ret.itemId);
  const sale = ret.saleId ? data.sales.find((s) => s.id === ret.saleId) : undefined;
  const rep = ret.replacementItemId ? a.itemInfo.get(ret.replacementItemId) : undefined;
  const keepsIt = ret.solution === "reparation" || ret.solution === "aucune";
  const [f, setF] = useState({ outcome: ret.outcome, claim: ret.claim, closed: ret.closed, note: ret.note ?? "", problem: ret.problem });
  const [money, setMoney] = useState<"fournisseur" | "reparation" | null>(null);
  const [saved, setSaved] = useState("");
  const { busy, error, run } = useRun(() => setSaved("Enregistré."));
  const moves = data.moves.filter((m) => "returnId" in m && m.returnId === ret.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Btn kind="link" onClick={onBack}>
            Tous les retours
          </Btn>
          <h2 className="mt-1 font-display text-3xl font-bold text-plum">
            Retour {returnNumber(ret)} {ret.closed ? <Badge tone="good">Clos</Badge> : <Badge tone="warn">En cours</Badge>}
          </h2>
          <p className="text-sm text-muted">
            {fmtDate(ret.date)} · {ret.origin === "cliente" ? "Rapportée par une cliente" : "Défaut constaté en stock"}
          </p>
        </div>
        <Btn
          kind="danger"
          onClick={() => {
            if (!window.confirm("Annuler ce retour ? La vente, l'article échangé et les mouvements d'argent du retour seront remis comme avant.")) return;
            run(async () => {
              await call("return.delete", { id: ret.id });
              onBack();
            });
          }}
        >
          Annuler le retour
        </Btn>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-line bg-white p-4 text-sm">
          <p className="text-muted">Perruque défectueuse</p>
          <p className="font-semibold text-plum">{info?.item.label ?? "Article supprimé"}</p>
          <p className="text-xs text-muted">
            Provenance :{" "}
            {info?.order ? (
              <button type="button" className="underline" onClick={() => go("commandes", { openOrder: info.order!.id })}>
                {info.order.name}
              </button>
            ) : (
              "inconnue"
            )}
            {info?.order?.supplier ? ` (${info.order.supplier})` : ""} · coût {F(info?.cost ?? 0)}
          </p>
        </div>
        {sale && (
          <div className="rounded-xl border border-line bg-white p-4 text-sm">
            <p className="text-muted">Cliente</p>
            <button type="button" className="font-semibold text-plum underline-offset-2 hover:underline" onClick={() => go("ventes", { openSale: sale.id })}>
              {sale.customer.name}, facture {invoiceNumber(sale)}
            </button>
            <p className="mt-1">{ret.solution && RETURN_SOLUTIONS[ret.solution]}</p>
            {rep && <p className="text-xs text-muted">Remplacée par : {rep.item.label}</p>}
            {(a.saleInfo.get(sale.id)?.credit ?? 0) > 0 && <p className="text-xs font-semibold text-whatsapp">Avoir disponible : {F(a.saleInfo.get(sale.id)!.credit)}</p>}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSaved("");
          run(() => call("return.update", { id: ret.id, ...f }));
        }}
        className="grid gap-4 rounded-xl border border-line bg-white p-4 sm:grid-cols-2"
      >
        <Field label="Le défaut" className="sm:col-span-2">
          <textarea rows={2} value={f.problem} onChange={(e) => setF({ ...f, problem: e.target.value })} className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm" />
        </Field>
        {keepsIt ? (
          <p className="text-sm text-muted">{RETURN_OUTCOMES.cliente}.</p>
        ) : (
          <Field label="Que devient la perruque ?">
            <select value={f.outcome} onChange={(e) => setF({ ...f, outcome: e.target.value as ReturnOutcome })} className={input}>
              {OUTCOMES.map((o) => (
                <option key={o} value={o}>
                  {RETURN_OUTCOMES[o]}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Réclamation au fournisseur">
          <select value={f.claim} onChange={(e) => setF({ ...f, claim: e.target.value as SupplierClaim })} className={input}>
            {(Object.keys(SUPPLIER_CLAIMS) as SupplierClaim[]).map((c) => (
              <option key={c} value={c}>
                {SUPPLIER_CLAIMS[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Note" className="sm:col-span-2">
          <input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} className={input} />
        </Field>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={f.closed} onChange={(e) => setF({ ...f, closed: e.target.checked })} />
          Retour terminé (plus rien à faire)
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button type="submit" disabled={busy} className="rounded-full bg-plum px-5 py-2 text-sm font-semibold text-gold-soft disabled:opacity-40">
            Enregistrer
          </button>
          {saved && <span className="text-sm text-whatsapp">{saved}</span>}
          {error && <span className="text-sm font-semibold text-wine">{error}</span>}
        </div>
      </form>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-xl font-bold text-plum">Argent lié au retour</h3>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => setMoney("fournisseur")}>Remboursement du fournisseur</Btn>
            <Btn kind="secondary" onClick={() => setMoney("reparation")}>
              Frais de réparation
            </Btn>
          </div>
        </div>
        {moves.length ? (
          <ul className="mt-2 divide-y divide-line rounded-xl border border-line bg-white">
            {moves.map((m) => {
              const isIn = m.kind === "expense" ? m.amount < 0 : m.amount > 0;
              const title =
                m.kind === "payment" ? `Remboursé à la cliente par ${PARTNER_NAMES[m.receivedBy]}` : m.kind === "expense" ? `${m.label}, ${m.amount < 0 ? "reçu par" : "payé par"} ${PAYER_NAMES[m.paidBy]}` : "";
              return (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                  <span>
                    {title}
                    <span className="block text-xs text-muted">{fmtDate(m.date)}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className={`font-semibold tabular-nums ${isIn ? "text-whatsapp" : "text-wine"}`}>{signed(isIn ? Math.abs(m.amount) : -Math.abs(m.amount))}</span>
                    <Btn
                      kind="link"
                      className="text-wine"
                      onClick={() => window.confirm("Supprimer ce mouvement ?") && run(() => call("return.moneyDelete", { id: ret.id, moveId: m.id }))}
                    >
                      Supprimer
                    </Btn>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-2">
            <Empty>Aucun mouvement d&apos;argent pour ce retour.</Empty>
          </div>
        )}
      </section>

      {money && <MoneyForm ret={ret} type={money} onClose={() => setMoney(null)} />}
    </div>
  );
}

export default function Returns() {
  const { data, a, intent, clearIntent } = useG();
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState<{ itemId?: string } | null>(null);
  const [showClosed, setShowClosed] = useState(false);

  useEffect(() => {
    if (intent?.reportItem) setForm({ itemId: intent.reportItem });
    if (intent) clearIntent();
  }, [intent, clearIntent]);

  const ret = data.returns.find((r) => r.id === open);
  if (ret) return <ReturnDetail ret={ret} onBack={() => setOpen(null)} />;

  const rows = data.returns.filter((r) => showClosed || !r.closed);
  const t = a.totals;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted">
          Perruques défectueuses rapportées par une cliente ou repérées dans le stock : ce que vous proposez à la cliente, ce que devient la perruque et la
          réclamation au fournisseur.
        </p>
        <Btn onClick={() => setForm({})}>Signaler un défaut</Btn>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-white p-4 text-sm">
          <p className="text-muted">Retours en cours</p>
          <p className="font-display text-2xl font-bold text-plum">{t.openReturns}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 text-sm">
          <p className="text-muted">Perruques en SAV</p>
          <p className="font-display text-2xl font-bold text-plum">{t.savCount}</p>
          <p className="text-xs text-muted">coût {F(t.savCost)}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 text-sm">
          <p className="text-muted">Pertes (articles hors d&apos;usage ou retirés)</p>
          <p className={`font-display text-2xl font-bold ${t.losses ? "text-wine" : "text-plum"}`}>{F(t.losses)}</p>
          <p className="text-xs text-muted">{t.lostCount} article{t.lostCount > 1 ? "s" : ""}</p>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
        Afficher aussi les retours terminés
      </label>
      {rows.length ? (
        <ul className="divide-y divide-line rounded-xl border border-line bg-white">
          {rows.map((r) => {
            const info = a.itemInfo.get(r.itemId);
            const sale = r.saleId ? data.sales.find((s) => s.id === r.saleId) : undefined;
            return (
              <li key={r.id}>
                <button type="button" onClick={() => setOpen(r.id)} className="flex w-full flex-wrap items-center justify-between gap-3 p-3 text-left text-sm hover:bg-ivory">
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold text-plum">
                      {returnNumber(r)} · {info?.item.label ?? "Article"}
                    </span>
                    <span className="block text-xs text-muted">
                      {fmtDate(r.date)} · {sale ? `${sale.customer.name}, ${r.solution ? RETURN_SOLUTIONS[r.solution].toLowerCase() : ""}` : "défaut en stock"} · {r.problem}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-1">
                    <Badge tone={r.outcome === "perte" ? "bad" : r.outcome === "stock" ? "good" : "neutral"}>{RETURN_OUTCOMES[r.outcome]}</Badge>
                    {r.claim !== "aucune" && <Badge tone={r.claim === "acceptee" ? "good" : r.claim === "refusee" ? "bad" : "warn"}>{SUPPLIER_CLAIMS[r.claim]}</Badge>}
                    {r.closed && <Badge tone="good">Clos</Badge>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty>{data.returns.length ? "Aucun retour en cours." : "Aucun retour pour l'instant. Tant mieux !"}</Empty>
      )}
      {form && <ReturnForm preset={form} onClose={() => setForm(null)} />}
    </div>
  );
}

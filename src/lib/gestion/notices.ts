import "server-only";
import type { Notice } from "../notify";
import { fmtFcfa } from "../pricing";
import { analyze, fmtDate, invoiceNumber, returnNumber } from "./compute";
import { invoiceKey } from "./store";
import {
  CATEGORIES,
  METHODS,
  PARTNER_NAMES,
  PAYER_NAMES,
  RETURN_OUTCOMES,
  RETURN_SOLUTIONS,
  SUPPLIER_CLAIMS,
  type GestionData,
  type Movement,
  type Sale,
} from "./types";

const F = fmtFcfa;

/** Short description of a money movement. */
function moveText(m: Movement, data: GestionData): { title: string; rows: [string, string][] } {
  if (m.kind === "payment") {
    const s = data.sales.find((x) => x.id === m.saleId);
    const who = s ? `${s.customer.name} (${invoiceNumber(s)})` : "cliente";
    if (m.method === "avoir") return { title: `Avoir ${m.amount < 0 ? "utilisé" : "reçu"} : ${F(Math.abs(m.amount))}, ${who}`, rows: [["Cliente", who]] };
    return {
      title: m.amount < 0 ? `Remboursement de ${F(-m.amount)} à ${who}` : `Paiement de ${F(m.amount)} reçu de ${who}`,
      rows: [
        ["Cliente", who],
        ...(s?.customer.phone ? ([["Téléphone", s.customer.phone]] as [string, string][]) : []),
        ["Montant", F(Math.abs(m.amount))],
        ["Moyen", METHODS[m.method]],
        [m.amount < 0 ? "Rendu par" : "Reçu par", PARTNER_NAMES[m.receivedBy]],
        ["Date", fmtDate(m.date)],
      ],
    };
  }
  if (m.kind === "expense") {
    const order = data.orders.find((o) => o.id === m.orderId);
    const refund = m.amount < 0;
    return {
      title: `${refund ? "Argent reçu" : "Dépense"} : ${m.label}, ${F(Math.abs(m.amount))}`,
      rows: [
        ["Type", CATEGORIES[m.category]],
        ["Montant", F(Math.abs(m.amount))],
        [refund ? "Reçu par" : "Payé par", PAYER_NAMES[m.paidBy] + (m.via ? ` (chez ${PARTNER_NAMES[m.via]})` : "")],
        ...(order ? ([["Commande", order.name]] as [string, string][]) : []),
        ["Date", fmtDate(m.date)],
      ],
    };
  }
  return {
    title: `Mouvement : ${PAYER_NAMES[m.from]} → ${PAYER_NAMES[m.to]}, ${F(m.amount)}`,
    rows: [
      ["De", PAYER_NAMES[m.from]],
      ["À", PAYER_NAMES[m.to]],
      ["Montant", F(m.amount)],
      ...(m.label ? ([["Libellé", m.label]] as [string, string][]) : []),
      ["Date", fmtDate(m.date)],
    ],
  };
}

/** Full picture of a sale, with where each wig comes from. */
function saleRows(sale: Sale, data: GestionData): { rows: [string, string][]; lines: string[] } {
  const a = analyze(data);
  const info = a.saleInfo.get(sale.id);
  const lines = sale.lines.map((l) => {
    const ii = a.itemInfo.get(l.itemId);
    return `- ${ii?.item.label ?? "Article"} (${ii?.order?.name ?? "commande inconnue"}) : ${F(l.price)}${l.returned ? " [retournée]" : ""}`;
  });
  const schedule = sale.schedule.map((t) => `${fmtDate(t.date)} : ${F(t.amount)}`).join("\n");
  return {
    rows: [
      ["Cliente", sale.customer.name],
      ["Téléphone", sale.customer.phone || "non renseigné"],
      ["Date de la vente", fmtDate(sale.date)],
      ["Total", F(info?.total ?? 0)],
      ["Payé", F(info?.paid ?? 0)],
      ["Reste à payer", F(Math.max(0, info?.remaining ?? 0))],
      ...(schedule ? ([["Échéances", schedule]] as [string, string][]) : []),
      ["Marge", F(info?.margin ?? 0)],
      ...(sale.note ? ([["Note", sale.note]] as [string, string][]) : []),
    ],
    lines: ["Articles :", ...lines],
  };
}

const diff = <T extends { id: string }>(before: T[], after: T[]) => ({
  added: after.filter((x) => !before.some((y) => y.id === x.id)),
  removed: before.filter((x) => !after.some((y) => y.id === x.id)),
});

/** E-mail describing a management action, or null for minor ones. */
export function gestionNotice(
  action: string,
  body: Record<string, unknown>,
  before: GestionData,
  after: GestionData,
  result: Record<string, unknown> | undefined,
  origin: string,
  actor: string,
): Notice | null {
  const base = { actor };
  const invoice = (s: Sale) => ({ label: "Voir la facture", url: `${origin}/facture/${s.id}?k=${invoiceKey(s.id)}` });
  const moves = diff(before.moves, after.moves);

  switch (action) {
    case "seed":
      return { ...base, subject: "Import des commandes", title: "Les commandes d'avant le site ont été importées", rows: [["Commandes", String(after.orders.length)], ["Articles", String(after.items.length)], ["Ventes", String(after.sales.length)]] };

    case "order.save": {
      const o = after.orders.find((x) => x.id === result?.id);
      if (!o) return null;
      const isNew = !before.orders.some((x) => x.id === o.id);
      return {
        ...base,
        subject: `${isNew ? "Nouvelle commande" : "Commande modifiée"} : ${o.name}`,
        title: `${isNew ? "Nouvelle commande fournisseur" : "Commande modifiée"} : ${o.name}`,
        rows: [["Fournisseur", o.supplier || "–"], ["Date", fmtDate(o.date)], ["Taux", `1 $ = ${o.rate} F`], ["Remise", `${o.discountUsd} $`], ["Fournisseur payé", o.settled ? "oui" : "pas encore"]],
      };
    }

    case "order.delete": {
      const o = before.orders.find((x) => x.id === body.id);
      return o ? { ...base, subject: `Commande supprimée : ${o.name}`, title: `Commande supprimée : ${o.name}`, rows: [["Fournisseur", o.supplier || "–"], ["Date", fmtDate(o.date)]] } : null;
    }

    case "items.add": {
      const added = diff(before.items, after.items).added;
      const o = after.orders.find((x) => x.id === body.orderId);
      return added.length
        ? { ...base, subject: `${added.length} article(s) ajouté(s) à ${o?.name}`, title: `${added.length} article(s) ajouté(s) à ${o?.name}`, lines: added.map((i) => `- ${i.label} : ${i.costUsd} $`) }
        : null;
    }

    case "item.delete": {
      const i = before.items.find((x) => x.id === body.id);
      return i ? { ...base, subject: `Article supprimé : ${i.label}`, title: `Article supprimé du stock : ${i.label}` } : null;
    }

    case "sale.save": {
      const s = after.sales.find((x) => x.id === result?.id);
      if (!s) return null;
      const isNew = !before.sales.some((x) => x.id === s.id);
      const { rows, lines } = saleRows(s, after);
      const total = rows.find(([k]) => k === "Total")?.[1] ?? "";
      return {
        ...base,
        subject: `${isNew ? "Nouvelle vente" : "Vente modifiée"} ${invoiceNumber(s)} : ${s.customer.name}, ${total}`,
        title: `${isNew ? "Nouvelle vente" : "Vente modifiée"}, facture ${invoiceNumber(s)}`,
        rows,
        lines,
        link: invoice(s),
      };
    }

    case "sale.delete": {
      const s = before.sales.find((x) => x.id === body.id);
      if (!s) return null;
      const { rows, lines } = saleRows(s, before);
      return { ...base, subject: `Vente supprimée ${invoiceNumber(s)} : ${s.customer.name}`, title: `Vente supprimée, facture ${invoiceNumber(s)}`, rows, lines: [...lines, "", "Les paiements de cette vente ont aussi été supprimés."] };
    }

    case "move.save": {
      const m = moves.added[0] ?? after.moves.find((x) => x.id === (body.move as { id?: string } | undefined)?.id);
      if (!m) return null;
      const t = moveText(m, after);
      const edited = !moves.added.length;
      const s = m.kind === "payment" ? after.sales.find((x) => x.id === m.saleId) : undefined;
      const remaining = s ? analyze(after).saleInfo.get(s.id)?.remaining : undefined;
      return {
        ...base,
        subject: `${edited ? "Modifié : " : ""}${t.title}`,
        title: `${edited ? "Mouvement modifié : " : ""}${t.title}`,
        rows: [...t.rows, ...(remaining !== undefined ? ([["Reste à payer sur la vente", F(Math.max(0, remaining))]] as [string, string][]) : [])],
        ...(s ? { link: invoice(s) } : {}),
      };
    }

    case "move.delete": {
      if (!moves.removed.length) return null;
      const t = moveText(moves.removed[0], before);
      return { ...base, subject: `Supprimé : ${t.title}`, title: `Mouvement supprimé : ${t.title}`, rows: t.rows, ...(moves.removed.length > 1 ? { lines: ["Son mouvement lié (avoir) a aussi été supprimé."] } : {}) };
    }

    case "return.create": {
      const r = after.returns.find((x) => x.id === result?.id);
      if (!r) return null;
      const it = after.items.find((x) => x.id === r.itemId);
      const order = after.orders.find((o) => o.id === it?.orderId);
      const s = r.saleId ? after.sales.find((x) => x.id === r.saleId) : undefined;
      const rep = r.replacementItemId ? after.items.find((x) => x.id === r.replacementItemId) : undefined;
      return {
        ...base,
        subject: `Retour ${returnNumber(r)} : ${it?.label}`,
        title: `Perruque défectueuse, retour ${returnNumber(r)}`,
        rows: [
          ["Article", it?.label ?? "–"],
          ["Provenance", order ? `${order.name} (${order.supplier || "fournisseur non précisé"})` : "–"],
          ["Origine", r.origin === "cliente" ? "Rapportée par une cliente" : "Défaut constaté en stock"],
          ...(s ? ([["Cliente", `${s.customer.name}, ${s.customer.phone || "pas de téléphone"} (${invoiceNumber(s)})`]] as [string, string][]) : []),
          ["Défaut", r.problem],
          ...(r.solution ? ([["Solution", RETURN_SOLUTIONS[r.solution]]] as [string, string][]) : []),
          ...(rep ? ([["Remplacée par", rep.label]] as [string, string][]) : []),
          ["Devenir de la perruque", RETURN_OUTCOMES[r.outcome]],
          ["Réclamation fournisseur", SUPPLIER_CLAIMS[r.claim]],
        ],
        lines: moves.added.map((m) => `- ${moveText(m, after).title}`),
        ...(s ? { link: invoice(s) } : {}),
      };
    }

    case "return.update": {
      const r = after.returns.find((x) => x.id === body.id);
      if (!r) return null;
      return {
        ...base,
        subject: `Retour ${returnNumber(r)} mis à jour${r.closed ? " (terminé)" : ""}`,
        title: `Retour ${returnNumber(r)} mis à jour`,
        rows: [["Devenir de la perruque", RETURN_OUTCOMES[r.outcome]], ["Réclamation fournisseur", SUPPLIER_CLAIMS[r.claim]], ["Statut", r.closed ? "Terminé" : "En cours"], ...(r.note ? ([["Note", r.note]] as [string, string][]) : [])],
      };
    }

    case "return.money":
    case "return.moneyDelete": {
      const r = after.returns.find((x) => x.id === body.id);
      const m = action === "return.money" ? moves.added[0] : moves.removed[0];
      if (!r || !m) return null;
      const t = moveText(m, action === "return.money" ? after : before);
      return { ...base, subject: `Retour ${returnNumber(r)} : ${action === "return.money" ? "" : "supprimé, "}${t.title}`, title: `Retour ${returnNumber(r)}${action === "return.money" ? "" : ", mouvement supprimé"} : ${t.title}`, rows: t.rows };
    }

    case "return.delete": {
      const r = before.returns.find((x) => x.id === body.id);
      const it = r && before.items.find((x) => x.id === r.itemId);
      return r ? { ...base, subject: `Retour ${returnNumber(r)} annulé`, title: `Retour ${returnNumber(r)} annulé`, rows: [["Article", it?.label ?? "–"], ["Défaut", r.problem]], lines: ["La vente, le stock et l'argent ont été remis comme avant le retour."] } : null;
    }

    case "credit.use":
    case "credit.refund": {
      if (!moves.added.length) return null;
      const t = moveText(moves.added[moves.added.length - 1], after);
      return { ...base, subject: t.title, title: action === "credit.use" ? `Avoir utilisé : ${t.title}` : t.title, rows: t.rows };
    }

    default:
      return null;
  }
}

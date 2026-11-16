import { NextResponse } from "next/server";
import { addDays, analyze, fmtDate, invoiceNumber, today } from "@/lib/gestion/compute";
import { loadGestion } from "@/lib/gestion/store";
import { PARTNER_NAMES } from "@/lib/gestion/types";
import { mailOwners } from "@/lib/notify";
import { fmtFcfa } from "@/lib/pricing";
import { siteUrl } from "@/lib/site";
import { dumpAll, listOrders, listRequests, listReviews, listWaitlist } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const F = fmtFcfa;

/**
 * Morning e-mail (Vercel Cron, see vercel.json): what to chase today, yesterday's activity,
 * and a full backup of the data as an attachment.
 */
export async function GET(req: Request) {
  // Vercel sends CRON_SECRET as a bearer token; nobody else can trigger the e-mail.
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const on = today();
  const yesterday = addDays(on, -1);
  const [data, siteOrders, requests, reviews, waitlist, backup] = await Promise.all([
    loadGestion(),
    listOrders(),
    listRequests(),
    listReviews(),
    listWaitlist(),
    dumpAll(),
  ]);
  const a = analyze(data, on);
  const day = (iso: string) => today(new Date(iso)) === yesterday;

  const late = a.dues.filter((d) => d.overdue > 0);
  const soon = a.dues.filter((d) => d.overdue <= 0 && d.next && d.next.date <= addDays(on, 7));
  const salesY = [...a.saleInfo.values()].filter((s) => s.sale.date === yesterday);
  const paysY = data.moves.filter((m) => m.kind === "payment" && m.date === yesterday && m.method !== "avoir");
  const expY = data.moves.filter((m) => m.kind === "expense" && m.date === yesterday);
  const sum = (xs: { amount: number }[]) => xs.reduce((s, x) => s + x.amount, 0);
  const due = (d: (typeof a.dues)[number]) =>
    `- ${d.sale.customer.name} (${d.sale.customer.phone || "pas de téléphone"}), ${invoiceNumber(d.sale)} : ${
      d.overdue > 0 ? `${F(d.overdue)} en retard` : d.next ? `${F(d.next.amount)} le ${fmtDate(d.next.date)}` : ""
    }, reste ${F(d.remaining)}`;
  const s = a.settlement;

  const sent = await mailOwners(
    {
      subject: `Résumé du ${fmtDate(on)}${late.length ? ` : ${late.length} retard${late.length > 1 ? "s" : ""}` : ""}`,
      title: `Bonjour ! Le point du ${fmtDate(on)}`,
      sections: [
        {
          title: "À relancer",
          lines: late.length || soon.length ? [...late.map(due), ...soon.map(due)] : ["Aucun paiement en retard ni à venir cette semaine."],
        },
        {
          title: "Hier",
          rows: [
            ["Ventes", `${salesY.length} (${F(salesY.reduce((x, y) => x + y.total, 0))})`],
            ["Paiements reçus", F(sum(paysY))],
            ["Dépenses", F(sum(expY))],
            ["Commandes sur le site", String(siteOrders.filter((o) => day(o.createdAt)).length)],
            ["Demandes de contact", String(requests.filter((r) => day(r.createdAt)).length)],
            ["Inscriptions à la liste d'attente", String(waitlist.filter((w) => day(w.createdAt)).length)],
          ],
        },
        {
          title: "En ce moment",
          rows: [
            ["Caisse Aurahair", F(a.totals.caisse)],
            ["Reste à encaisser", `${F(a.totals.receivable)}${a.totals.overdue ? `, dont ${F(a.totals.overdue)} en retard` : ""}`],
            ["Stock", `${a.totals.stockCount} articles (valeur visée ${F(a.totals.stockValue)})`],
            ["Retours en cours", String(a.totals.openReturns)],
            ["Avis à valider", String(reviews.filter((r) => r.status === "pending").length)],
            ["Liste d'attente", `${waitlist.filter((w) => !w.notifiedAt).length} personne(s) à prévenir`],
            ["Entre associés", s ? `${PARTNER_NAMES[s.from]} doit ${F(s.amount)} à ${PARTNER_NAMES[s.to]}` : "À égalité"],
          ],
        },
        {
          title: "Sauvegarde",
          lines: ["La sauvegarde complète des données est jointe à cet e-mail (fichier .json). Gardez-la : elle permet de tout restaurer."],
        },
      ],
      link: { label: "Ouvrir la gestion", url: `${siteUrl()}/admin/gestion` },
    },
    [{ filename: `aurahair-sauvegarde-${on}.json`, content: Buffer.from(JSON.stringify(backup)).toString("base64") }],
  );
  return NextResponse.json({ ok: true, sent });
}

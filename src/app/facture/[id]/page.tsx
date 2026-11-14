import Image from "next/image";
import { notFound } from "next/navigation";
import { timingSafeEqual } from "crypto";
import { analyze, effectiveSchedule, fmtDate, invoiceNumber } from "@/lib/gestion/compute";
import { invoiceKey, loadGestion } from "@/lib/gestion/store";
import { METHODS } from "@/lib/gestion/types";
import { fmtFcfa } from "@/lib/pricing";
import { getConfig } from "@/lib/store";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Customer invoice, opened from the WhatsApp link (signed with ?k=…). */
export default async function FacturePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ k?: string }> }) {
  const { id } = await params;
  const { k } = await searchParams;
  if (!k || !same(k, invoiceKey(id))) notFound();
  const [data, config] = await Promise.all([loadGestion(), getConfig()]);
  const a = analyze(data);
  const info = a.saleInfo.get(id);
  if (!info) notFound();
  const s = info.sale;
  let cum = 0;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 print:max-w-none print:p-0">
      <div className="rounded-2xl border border-line bg-white p-6 sm:p-10 print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-gold pb-6">
          <div>
            <Image src="/logo.png" alt="Aurahair Extension Co." width={438} height={257} className="h-16 w-auto" priority />
            <p className="mt-2 text-sm text-muted">Perruques et mèches 100 % vietnamiennes</p>
            <p className="text-sm text-muted">{config.contacts.map((c) => c.phone).join(" · ")}</p>
          </div>
          <div className="text-right">
            <h1 className="font-display text-3xl font-bold text-plum">Facture</h1>
            <p className="font-semibold">{invoiceNumber(s)}</p>
            <p className="text-sm text-muted">{fmtDate(s.date)}</p>
          </div>
        </header>

        <section className="mt-6 text-sm">
          <p className="text-muted">Cliente</p>
          <p className="text-lg font-semibold text-plum">{s.customer.name}</p>
          {s.customer.phone && <p>{s.customer.phone}</p>}
        </section>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-muted">
              <th className="py-2">Article</th>
              <th className="py-2 text-right">Prix</th>
            </tr>
          </thead>
          <tbody>
            {s.lines.map((l) => (
              <tr key={l.itemId} className="border-b border-line">
                <td className="py-3">{a.itemInfo.get(l.itemId)?.item.label ?? "Article"}</td>
                <td className="py-3 text-right tabular-nums">{fmtFcfa(l.price)}</td>
              </tr>
            ))}
            {s.discount > 0 && (
              <tr className="border-b border-line">
                <td className="py-3">Remise</td>
                <td className="py-3 text-right tabular-nums">− {fmtFcfa(s.discount)}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-4 font-semibold">Total</td>
              <td className="pt-4 text-right font-display text-2xl font-bold text-plum tabular-nums">{fmtFcfa(info.total)}</td>
            </tr>
            <tr>
              <td className="pt-1">Déjà payé</td>
              <td className="pt-1 text-right tabular-nums">{fmtFcfa(info.paid)}</td>
            </tr>
            <tr>
              <td className="pt-1 font-semibold">Reste à payer</td>
              <td className={`pt-1 text-right font-semibold tabular-nums ${info.remaining > 0 ? "text-wine" : ""}`}>{fmtFcfa(Math.max(0, info.remaining))}</td>
            </tr>
          </tfoot>
        </table>

        {info.remaining <= 0 && <p className="mt-6 rounded-lg bg-sand p-3 text-center font-semibold text-plum">Facture entièrement réglée. Merci !</p>}

        {s.schedule.length > 0 && (
          <section className="mt-8 text-sm">
            <h2 className="font-display text-xl font-bold text-plum">Échéancier</h2>
            <ul className="mt-2 divide-y divide-line">
              {effectiveSchedule(s).map((t, i) => {
                cum += t.amount;
                const ok = info.paid >= cum;
                return (
                  <li key={i} className="flex justify-between py-2">
                    <span>
                      {fmtDate(t.date)} {ok ? "· réglée" : t.date <= a.on ? "· en retard" : ""}
                    </span>
                    <span className="tabular-nums">{fmtFcfa(t.amount)}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {info.payments.length > 0 && (
          <section className="mt-8 text-sm">
            <h2 className="font-display text-xl font-bold text-plum">Paiements reçus</h2>
            <ul className="mt-2 divide-y divide-line">
              {info.payments.map((p) => (
                <li key={p.id} className="flex justify-between py-2">
                  <span>
                    {fmtDate(p.date)} · {METHODS[p.method]}
                  </span>
                  <span className="tabular-nums">{fmtFcfa(p.amount)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="mt-10 border-t border-line pt-4 text-xs text-muted">
          Aurahair Extension Co. Merci pour votre confiance. Pour toute question, écrivez-nous sur WhatsApp.
        </footer>
      </div>
      <PrintButton />
    </main>
  );
}

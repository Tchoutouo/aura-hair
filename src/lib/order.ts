import { fmtFcfa, fmtKg, fmtUsd } from "./pricing";
import type { CartQuote, Mode } from "./types";

export interface OrderSummaryInput {
  id: string;
  mode: Mode;
  customer: { name: string; phone: string; city: string; email?: string; note?: string };
  quote: CartQuote;
  rate: number;
  shippingPerKg: number;
}

const money = (usd: number, fcfa: number) => `${fmtUsd(usd)} (${fmtFcfa(fcfa)})`;

export function orderText(o: OrderSummaryInput): string {
  const q = o.quote;
  const out: string[] = [];
  out.push(`Bonjour Aura Hair, je souhaite valider ma commande.`);
  out.push("");
  out.push(`*Commande ${o.id}* – ${o.mode === "gros" ? "Achat en gros" : "Achat au détail"}`);
  out.push(`Client : ${o.customer.name}`);
  out.push(`Téléphone : ${o.customer.phone}`);
  out.push(`Ville : ${o.customer.city}`);
  if (o.customer.email) out.push(`E-mail : ${o.customer.email}`);
  out.push("");
  q.items.forEach((it, i) => {
    out.push(`*${i + 1}. ${it.title}*`);
    it.lines.forEach((l) => {
      const calc = l.qty !== 1 ? `${fmtUsd(l.unitUsd)} × ${l.qty.toString().replace(".", ",")} = ` : "";
      out.push(`   - ${l.label} (${l.detail}) : ${calc}${fmtUsd(l.totalUsd)}`);
    });
    if (it.count > 1) out.push(`   Nombre de perruques : ${it.count}`);
    out.push(`   Sous-total : ${money(it.usd, Math.round(it.usd * o.rate))}`);
  });
  out.push("");
  out.push(`Produits : ${money(q.productsUsd, q.productsFcfa)}`);
  out.push(
    `Transport vers le Cameroun : ${fmtFcfa(q.shippingFcfa)} (${fmtKg(q.weightKg)} × ${fmtFcfa(o.shippingPerKg)}/kg)`,
  );
  out.push(`*TOTAL : ${money(q.totalUsd, q.totalFcfa)}*`);
  out.push(`(Taux : 1 USD = ${o.rate} FCFA)`);
  if (o.customer.note) {
    out.push("");
    out.push(`Note : ${o.customer.note}`);
  }
  return out.join("\n");
}

export function whatsappLink(phone: string, text: string): string {
  return `https://wa.me/${phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(text)}`;
}

export function newOrderId(): string {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AH-${ymd}-${rnd}`;
}

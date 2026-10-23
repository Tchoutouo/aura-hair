import { getDict, type Lang } from "@/i18n";
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

/** Order summary sent on WhatsApp and by e-mail, in the customer's language. */
export function orderText(o: OrderSummaryInput, lang: Lang = "fr"): string {
  const t = getDict(lang).message;
  const q = o.quote;
  const out: string[] = [];
  out.push(t.hello);
  out.push("");
  out.push(`*${t.order} ${o.id}* – ${o.mode === "gros" ? t.gros : t.detail}`);
  out.push(`${t.customer} : ${o.customer.name}`);
  out.push(`${t.phone} : ${o.customer.phone}`);
  out.push(`${t.city} : ${o.customer.city}`);
  if (o.customer.email) out.push(`${t.email} : ${o.customer.email}`);
  out.push("");
  q.items.forEach((it, i) => {
    out.push(`*${i + 1}. ${it.title}*`);
    it.lines.forEach((l) => {
      const calc = l.qty !== 1 ? `${fmtUsd(l.unitUsd)} × ${getDict(lang).dec(l.qty)} = ` : "";
      out.push(`   - ${l.label} (${l.detail}) : ${calc}${fmtUsd(l.totalUsd)}`);
    });
    if (it.count > 1) out.push(`   ${t.wigs} : ${it.count}`);
    out.push(`   ${t.subtotal} : ${money(it.usd, Math.round(it.usd * o.rate))}`);
  });
  out.push("");
  out.push(`${t.products} : ${money(q.productsUsd, q.productsFcfa)}`);
  out.push(`${t.shipping} : ${fmtFcfa(q.shippingFcfa)} (${fmtKg(q.weightKg, lang)} × ${fmtFcfa(o.shippingPerKg)}/kg)`);
  out.push(`*${t.total} : ${money(q.totalUsd, q.totalFcfa)}*`);
  out.push(`(${t.rate} : 1 USD = ${o.rate} FCFA)`);
  if (o.customer.note) {
    out.push("");
    out.push(`${t.note} : ${o.customer.note}`);
  }
  return out.join("\n");
}

export function whatsappLink(phone: string, text: string): string {
  return `https://wa.me/${phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(text)}`;
}

function newId(prefix: string): string {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${ymd}-${rnd}`;
}

export const newOrderId = () => newId("AH");
export const newRequestId = () => newId("DM");

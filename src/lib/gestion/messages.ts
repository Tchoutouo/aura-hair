import { fmtFcfa } from "../pricing";
import { fmtDate, invoiceNumber, type SaleInfo } from "./compute";

/** Digits for wa.me: Cameroon numbers typed without the country code get +237. */
export function waNumber(phone: string): string {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 9 && d.startsWith("6")) d = `237${d}`;
  return d;
}

export const waLink = (phone: string, text: string) => `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`;

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

/** Message sent with the invoice link. */
export function invoiceMessage(info: SaleInfo, labels: string[], link: string): string {
  const s = info.sale;
  const out = [
    `Bonjour ${firstName(s.customer.name)}, merci pour votre achat chez Aurahair !`,
    "",
    `Facture ${invoiceNumber(s)} du ${fmtDate(s.date)}`,
    ...labels.map((l) => `- ${l}`),
    `Total : ${fmtFcfa(info.total)}`,
  ];
  if (info.paid > 0) out.push(`Déjà payé : ${fmtFcfa(info.paid)}`);
  if (info.remaining > 0) {
    out.push(`Reste à payer : ${fmtFcfa(info.remaining)}`);
    if (info.next) out.push(`Prochaine échéance : ${fmtFcfa(info.next.amount)} le ${fmtDate(info.next.date)}`);
  } else out.push("Facture entièrement réglée.");
  out.push("", `Votre facture : ${link}`);
  return out.join("\n");
}

/** Polite reminder once a tranche is due. */
export function reminderMessage(info: SaleInfo, link: string): string {
  const s = info.sale;
  const late = info.overdue > 0;
  return [
    `Bonjour ${firstName(s.customer.name)}, c'est Aurahair.`,
    late
      ? `Petit rappel : ${fmtFcfa(info.overdue)} de votre achat (facture ${invoiceNumber(s)}) étaient à régler${
          info.next ? ` le ${fmtDate(info.next.date)}` : ""
        }.`
      : `Petit rappel : votre prochaine échéance de ${fmtFcfa(info.next?.amount ?? info.remaining)} (facture ${invoiceNumber(s)}) arrive le ${fmtDate(info.next?.date ?? s.date)}.`,
    `Reste à payer au total : ${fmtFcfa(info.remaining)}.`,
    "Vous pouvez régler par MTN Mobile Money, Orange Money ou en espèces. Merci beaucoup !",
    "",
    `Votre facture : ${link}`,
  ].join("\n");
}

import type { Expense, GestionData, Item, Order, Payment, Sale, Transfer } from "./types";

/**
 * The partners' four orders before the site existed, from their Excel file (AURA-HAIR.xlsx)
 * and the two Silk Hair invoices. Dates were not in the files: everything is dated on the
 * import day, to be corrected in the app.
 * Orders 1 and 2: per-wig USD prices are estimates (purchase cost in FCFA from the "Vente" sheet ÷ 605);
 * they only weigh how the real cost is spread.
 */
export function seedData(date: string): GestionData {
  const createdAt = new Date().toISOString();
  const order = (id: string, name: string, supplier: string, rate: number, discountUsd: number, note: string): Order => ({
    id,
    name,
    date,
    supplier,
    rate,
    discountUsd,
    settled: true,
    note,
    createdAt,
  });
  const items: Item[] = [];
  const add = (orderId: string, rows: [string, number, number?, number?, Item["status"]?, string?][]) =>
    rows.forEach(([label, costUsd, price, minPrice, status, note], i) =>
      items.push({
        id: `${orderId}-${String(i + 1).padStart(2, "0")}`,
        orderId,
        label,
        costUsd,
        ...(price ? { price } : {}),
        ...(minPrice ? { minPrice } : {}),
        status: status ?? "stock",
        ...(note ? { note } : {}),
      }),
    );

  const orders = [
    order("c1", "Commande 1", "Vietnam", 605, 0, "Payée avec la commande 2 (894 839 F au total, moitié chacun). Prix en $ estimés depuis l'onglet Vente."),
    order("c2", "Commande 2", "Vietnam", 605, 0, "Payée avec la commande 1, remise de 3 % comprise. Prix en $ estimés depuis l'onglet Vente."),
    order("c3", "Commande 3", "Silk Hair", 610, 10, "Facture Silk Hair de 1 675 $, remise de 10 $. Paiement fournisseur avec 8 300 F de frais."),
    order("c4", "Commande 4", "Silk Hair", 610, 16, "Facture Silk Hair de 1 739 $, remise de 16 $. 500 000 F payés avec l'argent des ventes."),
  ];

  add("c1", [
    ["Bone Straight 10\" noir, closure 2x6, montée au Vietnam", 53, 75000],
    ["Bone Straight 12\" noir, closure 2x6, montée au Vietnam", 109, 90000, 85000],
    ["Bone Straight 12\" 2 tons, closure 2x6, montée au Vietnam", 117, 90000, 85000],
    ["Body Wave 12\" noir, closure 2x6, montée au Vietnam", 109, 90000, 85000],
  ]);
  add("c2", [
    ["Bone Straight 8\" noir, closure 5x5, montée au Cameroun", 88, 60000],
    ["Bouncy Curly 10\" noir, closure 5x5, montée au Cameroun", 92, 80000],
    ["Bone Straight 10\" 2 tons, closure 2x6", 102, 80000, 75000],
    ["Bone Straight 10\" noir, closure 5x5, montée au Cameroun", 79, 75000, 70000],
    ["Bone Straight 20\" noir, closure 5x5, montée au Cameroun", 157, 130000],
    ["Bouncy Curly 20\" noir, closure 5x5, montée au Cameroun", 179, 130000, 120000],
    ["Bone Straight 24\" noir, closure 5x5, montée au Cameroun", 246],
    ["Bouncy Curly 24\" noir, closure 5x5, montée au Cameroun", 267],
  ]);
  add("c3", [
    ["Bone Straight 6\" marron, closure 2x6", 59, 65000, 60000, "reserve", "En cours (fichier Excel)"],
    ["Bone Straight 6\" chocolat, closure 2x6", 59, 65000, 60000],
    ["Bone Straight 8\" brown, closure 2x6", 61, 70000, 65000],
    ["Bone Straight 16\" brown, closure 2x6", 103, 100000, 95000],
    ["Bone Straight 16\" 2 tons noir/bordeaux, closure 2x6", 103, 100000, 95000, "reserve", "En cours (fichier Excel)"],
    ["Bone Straight 18\" brown, closure 2x6", 138, 125000],
    ["Bone Straight 20\" ombré marron/orange, closure 2x6", 173, 150000],
    ["Bone Straight 24\" brown, closure 2x6", 210, 210000, 170000, "reserve", "Proposée à 210 000 F"],
    ["Bouncy Curly 12\" brown, closure 5x5", 90],
    ["Bouncy Curly 12\" piano, closure 5x5", 110],
    ["Bouncy Curly 14\" couleur naturelle, closure 5x5", 105],
    ["Bouncy Curly 16\" brown, closure 5x5", 127],
    ["Bouncy Curly 18\" chocolat, closure 5x5", 152],
    ["Bouncy Curly 20\" light chestnut, closure 5x5", 185],
  ]);
  add("c4", [
    ["Bone Straight 6\" naturel, closure 2x6", 51],
    ["Bone Straight 6\" naturel, closure 5x5", 61],
    ["Bone Straight 6\" ombré, closure 2x6", 59],
    ["Bone Straight 12\" ombré 4/6, closure 5x5", 90],
    ["Bone Straight 12\" ombré noir et bordeaux, closure 5x5", 90],
    ["Bone Straight 12\" naturel, closure 5x5", 84],
    ["Bone Straight 14\" ombré 4/6, closure 2x6", 88],
    ["Bone Straight 14\" naturel, closure 5x5", 82],
    ["Bone Straight 14\" naturel, closure 5x5", 94],
    ["Bone Straight 16\" dark brown, closure 5x5", 112],
    ["Bone Straight 16\" naturel, closure 5x5", 107],
    ["Bone Straight 16\" deux tons, closure 5x5", 112],
    ["Bone Straight 18\" naturel, closure 5x5, 250 g", 145],
    ["Bone Straight 18\" ombré 4/6, closure 2x6, 250 g", 138],
    ["Bone Straight 20\" naturel, closure 5x5, 250 g", 180],
    ["Bone Straight 20\" ombré 4/6, closure 2x6, 250 g", 175],
    ["Bone Straight 26\" dark brown, closure 5x5 (chỉ móc)", 71],
  ]);

  let n = 0;
  const exp = (e: Omit<Expense, "id" | "kind" | "date">): Expense => ({ id: `seed-e${++n}`, kind: "expense", date, ...e });
  const expenses: Expense[] = [
    exp({ category: "fournisseur", label: "Commande 1 (moitié du paiement commun)", amount: 116436, paidBy: "yvaltt", orderId: "c1" }),
    exp({ category: "fournisseur", label: "Commande 1 (moitié du paiement commun)", amount: 116436, paidBy: "lisa", orderId: "c1" }),
    exp({ category: "fournisseur", label: "Commande 2 (moitié du paiement commun)", amount: 330983, paidBy: "yvaltt", orderId: "c2" }),
    exp({ category: "fournisseur", label: "Commande 2 (moitié du paiement commun)", amount: 330983, paidBy: "lisa", orderId: "c2" }),
    exp({ category: "fournisseur", label: "Commande 3, frais de transfert compris", amount: 571450, paidBy: "yvaltt", orderId: "c3" }),
    exp({ category: "fournisseur", label: "Commande 3, frais de transfert compris", amount: 452500, paidBy: "lisa", orderId: "c3" }),
    exp({ category: "transport", label: "Transport commande 3", amount: 91500, paidBy: "lisa", orderId: "c3" }),
    exp({ category: "accessoires", label: "Micro", amount: 4000, paidBy: "yvaltt" }),
    exp({ category: "fournisseur", label: "Commande 4, apport de l'argent des ventes", amount: 500000, paidBy: "caisse", orderId: "c4" }),
    exp({ category: "fournisseur", label: "Commande 4, reste du paiement (moitié)", amount: 275515, paidBy: "yvaltt", orderId: "c4" }),
    exp({ category: "fournisseur", label: "Commande 4, reste du paiement (moitié)", amount: 275515, paidBy: "lisa", orderId: "c4" }),
    exp({ category: "transport", label: "Transport commande 4 (moitié)", amount: 37500, paidBy: "yvaltt", orderId: "c4" }),
    exp({ category: "transport", label: "Transport commande 4 (moitié)", amount: 37500, paidBy: "lisa", orderId: "c4" }),
  ];

  const settle: Transfer = {
    id: "seed-t1",
    kind: "transfer",
    date,
    from: "lisa",
    to: "yvaltt",
    amount: 15725,
    label: "Règlement de la commande 3",
  };

  // The three wigs already sold, cashed by Lisa. Customer names were not in the files.
  const sold: [string, number][] = [
    ["c2-05", 130000],
    ["c3-04", 110000],
    ["c3-06", 125000],
  ];
  const sales: Sale[] = sold.map(([itemId, price], i) => ({
    id: `seed-v${i + 1}`,
    number: i + 1,
    date,
    customer: { name: "Cliente à compléter", phone: "" },
    lines: [{ itemId, price }],
    discount: 0,
    schedule: [],
    note: "Vente d'avant le site : nom, téléphone et date à compléter.",
    reminders: [],
    createdAt,
  }));
  const pays: Payment[] = sold.map(([, price], i) => ({
    id: `seed-p${i + 1}`,
    kind: "payment",
    date,
    saleId: `seed-v${i + 1}`,
    amount: price,
    method: "autre",
    receivedBy: "lisa",
  }));

  return { orders, items, sales, moves: [...expenses, settle, ...pays] };
}

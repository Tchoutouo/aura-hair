import type { Metadata } from "next";
import { adminConfigured, currentAdmin } from "@/lib/auth";
import { invoiceKeys, loadGestion } from "@/lib/gestion/store";
import { storageReady } from "@/lib/store";
import GestionApp from "@/components/gestion/GestionApp";
import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Gestion des ventes – Aurahair", robots: { index: false } };

export default async function GestionPage() {
  const who = adminConfigured() ? await currentAdmin() : null;
  if (!who) return <LoginForm />;
  let data;
  try {
    data = await loadGestion();
  } catch (e) {
    console.error("loadGestion failed", e);
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="font-display text-3xl font-bold text-plum">Base de données injoignable</h1>
        <p className="mt-3 text-muted">Les données de gestion n&apos;ont pas pu être chargées. Rechargez la page dans un instant.</p>
      </div>
    );
  }
  return <GestionApp initial={data} initialKeys={invoiceKeys(data)} storageReady={storageReady()} sessionPartner={who === "shared" ? undefined : who} />;
}

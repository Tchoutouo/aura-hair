"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { analyze } from "@/lib/gestion/compute";
import { PARTNER_NAMES, PARTNERS, type GestionData, type Partner } from "@/lib/gestion/types";
import { InstallButton } from "../Pwa";
import Dashboard from "./Dashboard";
import Dues from "./Dues";
import Money from "./Money";
import Orders from "./Orders";
import Partners from "./Partners";
import Sales from "./Sales";
import Stock from "./Stock";
import { GestionContext, type Intent, type Tab } from "./ui";

const TABS: [Tab, string][] = [
  ["bord", "Tableau de bord"],
  ["commandes", "Commandes"],
  ["stock", "Stock"],
  ["ventes", "Ventes"],
  ["echeances", "Échéances"],
  ["caisse", "Caisse et dépenses"],
  ["associes", "Associés"],
];

const ME_KEY = "aura_gestion_me";

export default function GestionApp({
  initial,
  initialKeys,
  storageReady,
}: {
  initial: GestionData;
  initialKeys: Record<string, string>;
  storageReady: boolean;
}) {
  const [data, setData] = useState(initial);
  const [keys, setKeys] = useState(initialKeys);
  const [tab, setTab] = useState<Tab>("bord");
  const [intent, setIntent] = useState<Intent>(null);
  const [me, setMe] = useState<Partner>("yvaltt");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ME_KEY);
      if (saved === "yvaltt" || saved === "lisa") setMe(saved);
    } catch {}
  }, []);
  const chooseMe = (p: Partner) => {
    setMe(p);
    try {
      localStorage.setItem(ME_KEY, p);
    } catch {}
  };

  const a = useMemo(() => analyze(data), [data]);

  const call = useCallback(async (action: string, payload: Record<string, unknown> = {}) => {
    const res = await fetch("/api/admin/gestion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error("Session expirée : rechargez la page et reconnectez-vous.");
    if (!res.ok) throw new Error(json.error || "Erreur");
    setData(json.data);
    setKeys(json.keys);
    return json as Record<string, unknown>;
  }, []);

  const go = useCallback((t: Tab, i: Intent = null) => {
    setTab(t);
    setIntent(i);
    window.scrollTo({ top: 0 });
  }, []);

  const overdueCount = a.dues.filter((d) => d.overdue > 0).length;

  return (
    <GestionContext.Provider value={{ data, a, keys, me, call, go, intent, clearIntent: () => setIntent(null) }}>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/admin" className="text-sm text-muted underline">
              Espace admin
            </Link>
            <h1 className="font-display text-3xl font-bold text-plum">Gestion des ventes</h1>
            <InstallButton className="mt-2" />
          </div>
          <div role="group" aria-label="Qui utilise l'appli" className="flex items-center gap-2 text-sm">
            <span className="text-muted">Je suis</span>
            {PARTNERS.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={me === p}
                onClick={() => chooseMe(p)}
                className={`rounded-full px-3 py-1.5 font-semibold ${me === p ? "bg-plum text-gold-soft" : "border border-line bg-white text-plum"}`}
              >
                {PARTNER_NAMES[p]}
              </button>
            ))}
          </div>
        </div>

        {!storageReady && (
          <p className="mt-4 rounded-xl border border-gold bg-gold-soft p-4 text-sm">
            Le stockage (Upstash Redis) n&apos;est pas connecté : rien ne peut être enregistré.
          </p>
        )}

        <nav aria-label="Rubriques" className="-mx-4 mt-6 overflow-x-auto px-4">
          <div className="flex gap-2">
            {TABS.map(([t, label]) => (
              <button
                key={t}
                type="button"
                aria-current={tab === t ? "page" : undefined}
                onClick={() => go(t)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${tab === t ? "bg-plum text-gold-soft" : "border border-line bg-white text-plum"}`}
              >
                {label}
                {t === "echeances" && overdueCount > 0 && (
                  <span className="ml-2 rounded-full bg-wine px-1.5 text-xs text-white">{overdueCount}</span>
                )}
              </button>
            ))}
          </div>
        </nav>

        <div className="mt-6">
          {tab === "bord" && <Dashboard />}
          {tab === "commandes" && <Orders />}
          {tab === "stock" && <Stock />}
          {tab === "ventes" && <Sales />}
          {tab === "echeances" && <Dues />}
          {tab === "caisse" && <Money />}
          {tab === "associes" && <Partners />}
        </div>
      </div>
    </GestionContext.Provider>
  );
}

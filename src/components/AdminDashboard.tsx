"use client";

import { useState } from "react";
import { fmtFcfa, fmtUsd } from "@/lib/pricing";
import { CLOSURE_SIZES, LENGTHS, type Config, type PriceRow } from "@/lib/types";
import type { StoredOrder, StoredRequest } from "@/lib/store";

type Tab = "orders" | "requests" | "prices" | "settings";

const SUBJECTS: Record<StoredRequest["subject"], string> = {
  products: "Achat d'autres articles",
  visa: "Visa Vietnam",
  exchange: "Change de devises",
  other: "Autre",
};

const input = "h-9 w-full rounded-md border border-line bg-white px-2 text-sm";

function NumInput({ value, onChange, step = "1", label }: { value: number | null; onChange: (v: number | null) => void; step?: string; label: string }) {
  return (
    <input
      aria-label={label}
      type="number"
      min="0"
      step={step}
      value={value ?? ""}
      placeholder="—"
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      className={`${input} text-center`}
    />
  );
}

function PriceGrid({
  title,
  hint,
  columns,
}: {
  title: string;
  hint?: string;
  columns: { label: string; row: PriceRow; onChange: (row: PriceRow) => void }[];
}) {
  return (
    <section className="rounded-2xl border border-line bg-white p-4">
      <h3 className="font-display text-xl font-bold text-plum">{title}</h3>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr>
              <th className="p-1 text-left">Longueur</th>
              {columns.map((c) => (
                <th key={c.label} className="p-1 text-center font-semibold text-plum">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LENGTHS.map((l, i) => (
              <tr key={l} className="odd:bg-sand/60">
                <td className="p-1 font-semibold">{l}&quot;</td>
                {columns.map((c) => (
                  <td key={c.label} className="p-1">
                    <NumInput
                      label={`${c.label} ${l}"`}
                      value={c.row[i] ?? null}
                      onChange={(v) => c.onChange(c.row.map((x, j) => (j === i ? v : x)))}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function AdminDashboard({
  initialConfig,
  orders,
  requests,
  storageReady,
}: {
  initialConfig: Config;
  orders: StoredOrder[];
  requests: StoredRequest[];
  storageReady: boolean;
}) {
  const [tab, setTab] = useState<Tab>("orders");
  const [cfg, setCfg] = useState<Config>(initialConfig);
  const [status, setStatus] = useState("");
  const [dirty, setDirty] = useState(false);

  const update = (fn: (c: Config) => Config) => {
    setCfg((c) => fn(structuredClone(c)));
    setDirty(true);
  };

  async function save() {
    setStatus("Enregistrement…");
    const res = await fetch("/api/admin/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cfg),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setCfg(data.config);
      setDirty(false);
      setStatus("Enregistré. Les nouveaux prix sont en ligne.");
    } else setStatus(data.error || "Erreur");
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    window.location.reload();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold text-plum">Espace admin</h1>
        <button onClick={logout} className="text-sm text-wine underline">
          Se déconnecter
        </button>
      </div>

      {!storageReady && (
        <p className="mt-4 rounded-xl border border-gold bg-gold-soft p-4 text-sm">
          Le stockage n&apos;est pas encore connecté : le site utilise les prix par défaut et les commandes ne sont pas
          enregistrées. Dans Vercel, ajoutez l&apos;intégration <strong>Upstash Redis</strong> (Storage → Marketplace),
          puis redéployez.
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {(
          [
            ["orders", `Commandes (${orders.length})`],
            ["requests", `Demandes (${requests.length})`],
            ["prices", "Prix fournisseurs"],
            ["settings", "Réglages"],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === t ? "bg-plum text-gold-soft" : "border border-line bg-white text-plum"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {(tab === "prices" || tab === "settings") && (
        <div className="sticky top-20 z-20 mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-ivory/95 p-3 backdrop-blur">
          <button onClick={save} disabled={!dirty} className="rounded-full bg-plum px-5 py-2 text-sm font-semibold text-gold-soft disabled:opacity-40">
            Enregistrer les modifications
          </button>
          <span className="text-sm text-muted">{dirty ? "Modifications non enregistrées." : status}</span>
        </div>
      )}

      {tab === "orders" && (
        <div className="mt-6 space-y-3">
          {!orders.length && <p className="text-muted">Aucune commande pour l&apos;instant.</p>}
          {orders.map((o) => (
            <details key={o.id} className="rounded-xl border border-line bg-white p-4">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-plum">
                  {o.id} · {o.customer.name} · {o.customer.city}
                </span>
                <span className="text-sm">
                  <span className={`mr-2 rounded-full px-2 py-0.5 text-xs font-semibold ${o.mode === "gros" ? "bg-gold text-ink" : "bg-plum text-gold-soft"}`}>
                    {o.mode === "gros" ? "Gros" : "Détail"}
                  </span>
                  {o.lang === "en" && <span className="mr-2 rounded-full border border-line px-2 py-0.5 text-xs font-semibold">EN</span>}
                  {fmtFcfa(o.quote.totalFcfa)} · {new Date(o.createdAt).toLocaleString("fr-FR")}
                </span>
              </summary>
              <div className="mt-3 space-y-2 text-sm">
                <p>
                  Tél. :{" "}
                  <a className="text-plum underline" href={`https://wa.me/${o.customer.phone.replace(/[^\d]/g, "")}`} target="_blank" rel="noreferrer">
                    {o.customer.phone}
                  </a>
                  {o.customer.email ? ` · ${o.customer.email}` : ""}
                </p>
                <ul className="list-disc pl-5">
                  {o.quote.items.map((it, i) => (
                    <li key={i}>
                      {it.count > 1 ? `${it.count} × ` : ""}
                      {it.title} — {it.lines.map((l) => `${l.label}: ${fmtUsd(l.totalUsd)}`).join(", ")} → <strong>{fmtUsd(it.usd)}</strong>
                    </li>
                  ))}
                </ul>
                <p>
                  Produits {fmtUsd(o.quote.productsUsd)} · Transport {fmtFcfa(o.quote.shippingFcfa)} ({o.quote.weightKg} kg) · Total{" "}
                  <strong>{fmtFcfa(o.quote.totalFcfa)}</strong> (taux {o.rate})
                </p>
                {o.customer.note && <p className="italic">Note : {o.customer.note}</p>}
              </div>
            </details>
          ))}
        </div>
      )}

      {tab === "requests" && (
        <div className="mt-6 space-y-3">
          {!requests.length && <p className="text-muted">Aucune demande pour l&apos;instant.</p>}
          {requests.map((r) => (
            <details key={r.id} className="rounded-xl border border-line bg-white p-4">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-plum">
                  {SUBJECTS[r.subject] ?? r.subject} – {r.name}
                </span>
                <span className="text-sm text-muted">
                  {r.lang === "en" && <span className="mr-2 rounded-full border border-line px-2 py-0.5 text-xs font-semibold">EN</span>}
                  {r.id}, {new Date(r.createdAt).toLocaleString("fr-FR")}
                </span>
              </summary>
              <div className="mt-3 space-y-2 text-sm">
                <p>
                  Tél. :{" "}
                  <a className="text-plum underline" href={`https://wa.me/${r.phone.replace(/[^\d]/g, "")}`} target="_blank" rel="noreferrer">
                    {r.phone}
                  </a>
                  {r.email ? `, ${r.email}` : ""}
                </p>
                <p className="whitespace-pre-wrap">{r.message}</p>
              </div>
            </details>
          ))}
        </div>
      )}

      {tab === "prices" && (
        <div className="mt-6 space-y-6">
          <p className="text-sm text-muted">
            Saisissez les <strong>prix fournisseurs</strong> en USD. Le site ajoute automatiquement la marge (gros +
            {fmtUsd(cfg.margins.gros)}, détail +{fmtUsd(cfg.margins.detail)}) à chaque paquet et à chaque closure. Case vide =
            indisponible.
          </p>
          <PriceGrid
            title="Mèches – prix par paquet de 100 g"
            hint="Le supplément « couleur claire » Single Donor (sans marge) se règle dans Réglages."
            columns={[
              ...cfg.qualities.map((q, qi) => ({
                label: q.name,
                row: q.bundle,
                onChange: (row: PriceRow) => update((c) => ((c.qualities[qi].bundle = row), c)),
              })),
              {
                label: "Virgin couleur claire",
                row: cfg.lightPriceVirgin,
                onChange: (row: PriceRow) => update((c) => ((c.lightPriceVirgin = row), c)),
              },
            ]}
          />
          {(["single-donor", "virgin"] as const).map((fam) => (
            <PriceGrid
              key={fam}
              title={`Closures & frontals – ${fam === "virgin" ? "Virgin" : "Single Donor"}`}
              columns={CLOSURE_SIZES.map((s) => ({
                label: s,
                row: cfg.closures[fam][s],
                onChange: (row: PriceRow) => update((c) => ((c.closures[fam][s] = row), c)),
              }))}
            />
          ))}
        </div>
      )}

      {tab === "settings" && (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <section className="space-y-3 rounded-2xl border border-line bg-white p-4">
            <h3 className="font-display text-xl font-bold text-plum">Prix et transport</h3>
            {(
              [
                ["Taux : 1 USD = … FCFA", cfg.rateFcfaPerUsd, (v: number) => update((c) => ((c.rateFcfaPerUsd = v), c))],
                ["Transport Cameroun (FCFA par kg)", cfg.shippingFcfaPerKg, (v: number) => update((c) => ((c.shippingFcfaPerKg = v), c))],
                ["Marge gros (USD par paquet/pièce)", cfg.margins.gros, (v: number) => update((c) => ((c.margins.gros = v), c))],
                ["Marge détail (USD par paquet/pièce)", cfg.margins.detail, (v: number) => update((c) => ((c.margins.detail = v), c))],
                ["Poids d'un paquet (g)", cfg.bundleWeightG, (v: number) => update((c) => ((c.bundleWeightG = v), c))],
                ["Montage de perruque au Vietnam (USD, sans marge)", cfg.mountingFeeUsd, (v: number) => update((c) => ((c.mountingFeeUsd = v), c))],
              ] as [string, number, (v: number) => void][]
            ).map(([label, value, set]) => (
              <label key={label} className="block text-sm">
                {label}
                <NumInput label={label} value={value} step="0.01" onChange={(v) => set(v ?? 0)} />
              </label>
            ))}
          </section>

          <section className="space-y-3 rounded-2xl border border-line bg-white p-4">
            <h3 className="font-display text-xl font-bold text-plum">Poids des closures (g)</h3>
            <p className="text-xs text-muted">Sert au calcul du transport.</p>
            <div className="grid grid-cols-4 gap-2">
              {CLOSURE_SIZES.map((s) => (
                <label key={s} className="text-sm">
                  {s}
                  <NumInput label={`Poids ${s}`} value={cfg.closureWeightG[s]} onChange={(v) => update((c) => ((c.closureWeightG[s] = v ?? 0), c))} />
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-line bg-white p-4">
            <h3 className="font-display text-xl font-bold text-plum">Paquets par perruque</h3>
            <p className="text-xs text-muted">Jusqu&apos;à telle longueur (incluse), on utilise tant de paquets.</p>
            {cfg.bundleRules.map((r, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 text-sm">
                <label>
                  Jusqu&apos;à (pouces)
                  <NumInput label="Longueur max" value={r.maxLength} onChange={(v) => update((c) => ((c.bundleRules[i].maxLength = v ?? 0), c))} />
                </label>
                <label>
                  Paquets
                  <NumInput label="Paquets" step="0.5" value={r.bundles} onChange={(v) => update((c) => ((c.bundleRules[i].bundles = v ?? 0), c))} />
                </label>
              </div>
            ))}
          </section>

          <section className="space-y-3 rounded-2xl border border-line bg-white p-4">
            <h3 className="font-display text-xl font-bold text-plum">Couleur claire – Single Donor</h3>
            <p className="text-xs text-muted">Supplément par paquet de 100 g, ajouté au prix (sans marge).</p>
            {cfg.lightSurchargeSingleDonor.map((r, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 text-sm">
                <label>
                  Jusqu&apos;à (pouces)
                  <NumInput label="Longueur max" value={r.maxLength} onChange={(v) => update((c) => ((c.lightSurchargeSingleDonor[i].maxLength = v ?? 0), c))} />
                </label>
                <label>
                  Supplément (USD)
                  <NumInput label="Supplément" value={r.add} onChange={(v) => update((c) => ((c.lightSurchargeSingleDonor[i].add = v ?? 0), c))} />
                </label>
              </div>
            ))}
          </section>

          <section className="space-y-3 rounded-2xl border border-line bg-white p-4 md:col-span-2">
            <h3 className="font-display text-xl font-bold text-plum">Contacts et e-mail</h3>
            <label className="block text-sm">
              E-mail qui reçoit les commandes
              <input type="email" className={input} value={cfg.orderEmail} onChange={(e) => update((c) => ((c.orderEmail = e.target.value), c))} />
            </label>
            {cfg.contacts.map((ct, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 text-sm">
                <label>
                  Libellé
                  <input className={input} value={ct.label} onChange={(e) => update((c) => ((c.contacts[i].label = e.target.value), c))} />
                </label>
                <label>
                  Numéro WhatsApp
                  <input className={input} value={ct.phone} onChange={(e) => update((c) => ((c.contacts[i].phone = e.target.value), c))} />
                </label>
                <button className="h-9 text-sm text-wine underline" onClick={() => update((c) => (c.contacts.splice(i, 1), c))}>
                  Retirer
                </button>
              </div>
            ))}
            <button className="text-sm font-semibold text-plum underline" onClick={() => update((c) => (c.contacts.push({ label: "", phone: "" }), c))}>
              + Ajouter un numéro
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

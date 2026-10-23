"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { TEXTURES, textureImage } from "@/lib/defaults";
import {
  bundlePrice,
  bundlesForLength,
  closureLabel,
  closurePrice,
  fmtFcfa,
  fmtKg,
  fmtUsd,
  quoteCart,
  quoteItem,
} from "@/lib/pricing";
import {
  CLOSURE_SIZES,
  LENGTHS,
  type CartItem,
  type ClosureSize,
  type Color,
  type Config,
  type Family,
  type Length,
  type Mode,
} from "@/lib/types";

type Prices = Record<Mode, Config>;

const pill = (active: boolean, disabled = false) =>
  `rounded-lg border px-3 py-2 text-sm font-semibold transition ${
    disabled
      ? "cursor-not-allowed border-line bg-sand/60 text-muted/50 line-through"
      : active
        ? "border-plum bg-plum text-gold-soft"
        : "border-line bg-white text-plum hover:border-plum"
  }`;

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold tracking-wide text-rust">{label}</legend>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </fieldset>
  );
}

function Stepper({ value, onChange, min = 1, label }: { value: number; onChange: (n: number) => void; min?: number; label: string }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-line bg-white">
      <button type="button" aria-label={`Diminuer ${label}`} className="h-11 w-11 text-xl text-plum" onClick={() => onChange(Math.max(min, value - 1))}>
        −
      </button>
      <input
        aria-label={label}
        inputMode="numeric"
        className="h-11 w-14 border-x border-line text-center font-semibold"
        value={value}
        onChange={(e) => onChange(Math.max(min, parseInt(e.target.value.replace(/\D/g, "") || String(min), 10)))}
      />
      <button type="button" aria-label={`Augmenter ${label}`} className="h-11 w-11 text-xl text-plum" onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
}

function TexturePicker({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  const img = textureImage(value);
  return (
    <div className="flex items-center gap-3">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-line bg-sand">
        {img ? (
          <Image src={img} alt={value} width={128} height={128} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] font-semibold text-muted">LISSE</div>
        )}
      </div>
      <select
        aria-label="Texture"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-lg border border-line bg-white px-3 font-semibold text-plum"
      >
        {TEXTURES.map((t) => (
          <option key={t}>{t}</option>
        ))}
      </select>
    </div>
  );
}

function QualityPicker({ config, value, onChange }: { config: Config; value: string; onChange: (id: string) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {config.qualities.map((q) => (
        <button key={q.id} type="button" onClick={() => onChange(q.id)} className={`${pill(value === q.id)} py-3 text-left`}>
          <span className="block text-xs font-medium opacity-80">{q.family === "virgin" ? "Virgin" : "Single Donor"}</span>
          {q.name.split("–")[1]?.trim() ?? q.name}
        </button>
      ))}
    </div>
  );
}

function LengthPicker({ value, onChange, isAvailable }: { value: Length; onChange: (l: Length) => void; isAvailable: (l: Length) => boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {LENGTHS.map((l) => {
        const ok = isAvailable(l);
        return (
          <button key={l} type="button" disabled={!ok} onClick={() => onChange(l)} className={pill(value === l, !ok)}>
            {l}&quot;
          </button>
        );
      })}
    </div>
  );
}

function ColorPicker({ value, onChange }: { value: Color; onChange: (c: Color) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => onChange("natural")} className={pill(value === "natural")}>
        Naturelle (noir / 1B)
      </button>
      <button type="button" onClick={() => onChange("light")} className={pill(value === "light")}>
        Claire : gray, blonde, 27, 613…
      </button>
    </div>
  );
}

export default function OrderBuilder({ prices, initialMode }: { prices: Prices; initialMode: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const config = prices[mode];
  const [cart, setCart] = useState<CartItem[]>([]);

  // Builder state
  const [quality, setQuality] = useState(config.qualities[1]?.id ?? config.qualities[0].id);
  const [texture, setTexture] = useState<string>("Body Wave");
  const [length, setLength] = useState<Length>(18);
  const [closure, setClosure] = useState<ClosureSize | null>("5x5");
  const [color, setColor] = useState<Color>("natural");
  const [qty, setQty] = useState(initialMode === "gros" ? 10 : 1);
  const [grosTab, setGrosTab] = useState<"bundle" | "closure">("bundle");
  const [family, setFamily] = useState<Family>("single-donor");
  const [size, setSize] = useState<ClosureSize>("4x4");

  const q = config.qualities.find((x) => x.id === quality) ?? config.qualities[0];

  const current: CartItem =
    mode === "detail"
      ? { kind: "wig", quality, texture, length, closure, color, qty }
      : grosTab === "bundle"
        ? { kind: "bundle", quality, texture, length, color, qty }
        : { kind: "closure", family, size, length, qty };

  const currentQuote = quoteItem(config, mode, current);
  const cartQuote = useMemo(() => quoteCart(config, mode, cart), [config, mode, cart]);

  function switchMode(m: Mode) {
    if (m === mode) return;
    if (cart.length && !window.confirm("Changer de type d'achat vide votre panier (les prix sont différents). Continuer ?")) return;
    setCart([]);
    setMode(m);
    setQty(m === "gros" ? 10 : 1);
    window.history.replaceState(null, "", `/commander?mode=${m}`);
  }

  function addToCart() {
    if (!currentQuote.ok) return;
    setCart((c) => [...c, current]);
    document.getElementById("panier")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const lengthOkBundle = (l: Length) => bundlePrice(config, mode, q, l, color) != null;
  const lengthOkClosure = (l: Length) => closurePrice(config, mode, family, size, l) != null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-4xl font-bold text-plum md:text-5xl">Calculer mon prix</h1>
      <p className="mt-2 max-w-3xl text-muted">
        Le prix s&apos;affiche en direct, en dollars et en francs CFA. Le transport vers le Cameroun ({fmtFcfa(config.shippingFcfaPerKg)}/kg)
        est calculé selon le poids et affiché à part.
      </p>

      {/* Mode */}
      <div role="tablist" aria-label="Type d'achat" className="mt-6 inline-flex rounded-full border-2 border-plum p-1">
        {(["detail", "gros"] as Mode[]).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            type="button"
            onClick={() => switchMode(m)}
            className={`rounded-full px-5 py-2 text-sm font-semibold ${mode === m ? "bg-plum text-gold-soft" : "text-plum"}`}
          >
            {m === "detail" ? "Achat au détail" : "Achat en gros"}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Builder */}
        <section className="space-y-7 rounded-2xl border border-line bg-white p-5 md:p-7">
          <h2 className="font-display text-2xl font-bold text-plum">
            {mode === "detail" ? "Ma perruque" : "Ajouter des articles"}
          </h2>

          {mode === "gros" && (
            <div className="flex gap-2">
              <button type="button" className={pill(grosTab === "bundle")} onClick={() => setGrosTab("bundle")}>
                Mèches (paquets)
              </button>
              <button type="button" className={pill(grosTab === "closure")} onClick={() => setGrosTab("closure")}>
                Closures &amp; frontals
              </button>
            </div>
          )}

          {(mode === "detail" || grosTab === "bundle") && (
            <>
              <Field label="Qualité">
                <QualityPicker config={config} value={quality} onChange={setQuality} />
              </Field>
              <Field label="Texture">
                <TexturePicker value={texture} onChange={setTexture} />
              </Field>
              <Field
                label="Longueur de la mèche"
                hint={
                  mode === "detail"
                    ? `Pour ${length}", il faut ${bundlesForLength(config, length).toString().replace(".", ",")} paquets de 100 g.`
                    : undefined
                }
              >
                <LengthPicker value={length} onChange={setLength} isAvailable={lengthOkBundle} />
              </Field>
              {mode === "detail" && (
                <Field label="Closure ou frontal">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={pill(closure === null)} onClick={() => setClosure(null)}>
                      Sans
                    </button>
                    {CLOSURE_SIZES.map((s) => {
                      const ok = closurePrice(config, mode, q.family, s, length) != null;
                      return (
                        <button key={s} type="button" disabled={!ok} className={pill(closure === s, !ok)} onClick={() => setClosure(s)}>
                          {closureLabel(s)}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              )}
              <Field label="Couleur">
                <ColorPicker value={color} onChange={setColor} />
              </Field>
            </>
          )}

          {mode === "gros" && grosTab === "closure" && (
            <>
              <Field label="Qualité">
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={pill(family === "single-donor")} onClick={() => setFamily("single-donor")}>
                    Single Donor
                  </button>
                  <button type="button" className={pill(family === "virgin")} onClick={() => setFamily("virgin")}>
                    Virgin
                  </button>
                </div>
              </Field>
              <Field label="Taille">
                <div className="flex flex-wrap gap-2">
                  {CLOSURE_SIZES.map((s) => (
                    <button key={s} type="button" className={pill(size === s)} onClick={() => setSize(s)}>
                      {closureLabel(s)}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Longueur">
                <LengthPicker value={length} onChange={setLength} isAvailable={lengthOkClosure} />
              </Field>
            </>
          )}

          <Field label={mode === "detail" ? "Nombre de perruques" : grosTab === "bundle" ? "Nombre de paquets" : "Nombre de pièces"}>
            <Stepper value={qty} onChange={setQty} label="quantité" />
          </Field>

          {/* Live price of the current item */}
          <div className="rounded-xl bg-sand p-5">
            {currentQuote.ok ? (
              <>
                <ul className="space-y-1 text-sm">
                  {currentQuote.lines.map((l) => (
                    <li key={l.label} className="flex justify-between gap-4">
                      <span>
                        {l.label} <span className="text-muted">· {l.detail}</span>
                      </span>
                      <span className="font-semibold whitespace-nowrap">
                        {l.qty !== 1 ? `${fmtUsd(l.unitUsd)} × ${l.qty.toString().replace(".", ",")} = ` : ""}
                        {fmtUsd(l.totalUsd)}
                      </span>
                    </li>
                  ))}
                  {currentQuote.count > 1 && (
                    <li className="flex justify-between text-muted">
                      <span>× {currentQuote.count} perruques</span>
                    </li>
                  )}
                </ul>
                <div className="mt-3 flex flex-wrap items-end justify-between gap-2 border-t border-line pt-3">
                  <span className="text-sm text-muted">
                    Produits ({fmtKg(currentQuote.weightG / 1000)}), hors transport
                  </span>
                  <span className="text-right">
                    <span className="block font-display text-2xl font-bold text-plum">{fmtUsd(currentQuote.usd)}</span>
                    <span className="text-sm font-semibold text-muted">{fmtFcfa(currentQuote.usd * config.rateFcfaPerUsd)}</span>
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm font-semibold text-wine">{currentQuote.error}</p>
            )}
          </div>

          <button
            type="button"
            disabled={!currentQuote.ok}
            onClick={addToCart}
            className="w-full rounded-full bg-plum px-6 py-3 font-semibold text-gold-soft hover:bg-plum-2 disabled:opacity-40"
          >
            Ajouter à ma commande
          </button>
        </section>

        {/* Cart + checkout */}
        <aside id="panier" className="scroll-mt-24 lg:sticky lg:top-24 lg:self-start">
          <Cart
            config={config}
            mode={mode}
            cart={cart}
            quote={cartQuote}
            onRemove={(i) => setCart((c) => c.filter((_, j) => j !== i))}
          />
        </aside>
      </div>
    </div>
  );
}

function Cart({
  config,
  mode,
  cart,
  quote,
  onRemove,
}: {
  config: Config;
  mode: Mode;
  cart: CartItem[];
  quote: ReturnType<typeof quoteCart>;
  onRemove: (i: number) => void;
}) {
  const [form, setForm] = useState({ name: "", phone: "", city: "", email: "", note: "" });
  const [contact, setContact] = useState(config.contacts[0]?.phone ?? "");
  const [status, setStatus] = useState<{ state: "idle" | "sending" | "done" | "error"; msg?: string; link?: string }>({ state: "idle" });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!cart.length) return;
    setStatus({ state: "sending" });
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, items: cart, customer: form, contact }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setStatus({ state: "done", msg: data.id, link: data.whatsapp });
      window.location.href = data.whatsapp;
    } catch (err) {
      setStatus({ state: "error", msg: err instanceof Error ? err.message : "Erreur" });
    }
  }

  return (
    <div className="space-y-5 rounded-2xl border-2 border-plum bg-white p-5">
      <h2 className="font-display text-2xl font-bold text-plum">Ma commande</h2>
      {!cart.length ? (
        <p className="text-sm text-muted">Votre panier est vide. Configurez un article puis cliquez sur « Ajouter à ma commande ».</p>
      ) : (
        <>
          <ul className="divide-y divide-line">
            {quote.items.map((it, i) => (
              <li key={i} className="flex items-start justify-between gap-3 py-3">
                <div className="text-sm">
                  <p className="font-semibold text-plum">
                    {it.count > 1 ? `${it.count} × ` : ""}
                    {it.title}
                  </p>
                  <p className="text-muted">{it.lines.map((l) => `${l.label} (${l.detail})`).join(" · ")}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold whitespace-nowrap">{fmtUsd(it.usd)}</p>
                  <button type="button" onClick={() => onRemove(i)} className="text-xs text-wine underline">
                    Retirer
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <dl className="space-y-2 rounded-xl bg-sand p-4 text-sm">
            <div className="flex justify-between gap-2">
              <dt>Produits</dt>
              <dd className="text-right font-semibold">
                {fmtUsd(quote.productsUsd)} <span className="text-muted">· {fmtFcfa(quote.productsFcfa)}</span>
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>
                Transport vers le Cameroun
                <span className="block text-xs text-muted">
                  {fmtKg(quote.weightKg)} × {fmtFcfa(config.shippingFcfaPerKg)}/kg
                </span>
              </dt>
              <dd className="text-right font-semibold">
                {fmtFcfa(quote.shippingFcfa)} <span className="block text-xs text-muted">≈ {fmtUsd(quote.shippingUsd)}</span>
              </dd>
            </div>
            <div className="flex items-end justify-between gap-2 border-t border-line pt-2">
              <dt className="font-semibold text-plum">Total</dt>
              <dd className="text-right">
                <span className="block font-display text-2xl font-bold text-plum">{fmtFcfa(quote.totalFcfa)}</span>
                <span className="text-sm font-semibold text-muted">{fmtUsd(quote.totalUsd)}</span>
              </dd>
            </div>
            <p className="text-xs text-muted">Taux appliqué : 1 USD = {config.rateFcfaPerUsd} FCFA.</p>
          </dl>
        </>
      )}

      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm font-semibold tracking-wide text-rust">MES COORDONNÉES</p>
        {(
          [
            ["name", "Nom complet", "text", true],
            ["phone", "Téléphone WhatsApp", "tel", true],
            ["city", "Ville de livraison", "text", true],
            ["email", "E-mail (pour recevoir une copie)", "email", false],
          ] as const
        ).map(([k, label, type, req]) => (
          <label key={k} className="block text-sm">
            <span className="font-medium text-ink">
              {label}
              {req ? " *" : ""}
            </span>
            <input
              type={type}
              required={req}
              value={form[k]}
              onChange={set(k)}
              className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3"
            />
          </label>
        ))}
        <label className="block text-sm">
          <span className="font-medium text-ink">Précisions (facultatif)</span>
          <textarea value={form.note} onChange={set("note")} rows={2} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2" />
        </label>
        <fieldset className="text-sm">
          <legend className="font-medium text-ink">Envoyer ma commande au numéro</legend>
          <div className="mt-1 space-y-1">
            {config.contacts.map((c) => (
              <label key={c.phone} className="flex items-center gap-2">
                <input type="radio" name="contact" checked={contact === c.phone} onChange={() => setContact(c.phone)} />
                {c.label} : {c.phone}
              </label>
            ))}
          </div>
        </fieldset>
        <button
          type="submit"
          disabled={!cart.length || !quote.ok || status.state === "sending"}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-whatsapp px-6 py-3 font-semibold text-white hover:brightness-110 disabled:opacity-40"
        >
          {status.state === "sending" ? "Envoi…" : "Valider ma commande sur WhatsApp"}
        </button>
        <p className="text-xs leading-relaxed text-muted">
          Nous achetons directement chez nos fournisseurs partenaires, vérifions les produits et payons nous-mêmes le
          fournisseur. Rien n&apos;est payé en ligne : nous confirmons tout avec vous sur WhatsApp.
        </p>
        {status.state === "done" && status.link && (
          <p className="rounded-lg bg-sand p-3 text-sm">
            Commande <strong>{status.msg}</strong> enregistrée. Si WhatsApp ne s&apos;est pas ouvert,{" "}
            <a href={status.link} className="font-semibold text-plum underline">
              cliquez ici
            </a>
            .
          </p>
        )}
        {status.state === "error" && <p className="text-sm font-semibold text-wine">{status.msg}</p>}
      </form>
    </div>
  );
}

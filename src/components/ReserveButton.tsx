"use client";

import { useState } from "react";
import { getDict, type Lang } from "@/i18n";

/** "Reserve it": short form, then WhatsApp opens with the reservation. */
export default function ReserveButton({ lang, itemId, label }: { lang: Lang; itemId: string; label: string }) {
  const t = getDict(lang).dispo;
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", phone: "", city: "" });
  const [state, setState] = useState<{ s: "idle" | "sending" | "done" | "error"; msg?: string; link?: string }>({ s: "idle" });
  const input = "mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm";

  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="w-full rounded-full bg-plum px-4 py-2.5 text-sm font-semibold text-gold-soft hover:bg-plum-2">
        {t.reserve}
      </button>
    );

  if (state.s === "done")
    return (
      <p role="status" className="rounded-lg bg-sand p-3 text-sm">
        {t.done}{" "}
        {state.link && (
          <a href={state.link} className="font-semibold text-plum underline">
            {t.clickHere}
          </a>
        )}
        .
      </p>
    );

  return (
    <form
      aria-label={t.reserveTitle(label)}
      onSubmit={async (e) => {
        e.preventDefault();
        setState({ s: "sending" });
        const res = await fetch("/api/reserve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, itemId, lang }) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return setState({ s: "error", msg: data.error });
        setState({ s: "done", link: data.whatsapp });
        if (data.whatsapp) window.location.href = data.whatsapp;
      }}
      className="space-y-2"
    >
      <label className="block text-sm">
        <span className="font-medium text-ink">{t.name}</span>
        <input required autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" className={input} />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-ink">{t.phone}</span>
        <input required type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} autoComplete="tel" className={input} />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-ink">{t.city}</span>
        <input required value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} autoComplete="address-level2" className={input} />
      </label>
      <button disabled={state.s === "sending"} className="w-full rounded-full bg-whatsapp px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50">
        {state.s === "sending" ? t.sending : t.submit}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="w-full text-sm text-muted underline">
        {t.close}
      </button>
      <p aria-live="polite" className="text-sm font-semibold text-wine">
        {state.s === "error" ? state.msg : ""}
      </p>
    </form>
  );
}

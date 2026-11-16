"use client";

import { useState } from "react";
import { getDict, type Lang } from "@/i18n";

/** "Tell me when the next parcel arrives": name + WhatsApp number. */
export default function WaitlistForm({ lang }: { lang: Lang }) {
  const t = getDict(lang).waitlist;
  const [f, setF] = useState({ name: "", phone: "", wish: "" });
  const [state, setState] = useState<{ s: "idle" | "sending" | "done" | "error"; msg?: string }>({ s: "idle" });
  const input = "mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm";

  if (state.s === "done")
    return (
      <p role="status" className="rounded-xl bg-plum p-5 text-gold-soft">
        {t.thanks}
      </p>
    );

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setState({ s: "sending" });
        const res = await fetch("/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, lang }) });
        const data = await res.json().catch(() => ({}));
        setState(res.ok ? { s: "done" } : { s: "error", msg: data.error });
      }}
      className="rounded-2xl border-2 border-gold bg-white p-5 md:p-7"
    >
      <h2 className="font-display text-2xl font-bold text-plum">{t.title}</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted">{t.text}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:items-end">
        <label className="block text-sm">
          <span className="font-medium text-ink">{t.name}</span>
          <input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="given-name" className={input} />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ink">{t.phone}</span>
          <input required type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} autoComplete="tel" className={input} />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ink">{t.wish}</span>
          <input value={f.wish} onChange={(e) => setF({ ...f, wish: e.target.value })} placeholder={t.wishHint} className={input} />
        </label>
        <button disabled={state.s === "sending"} className="h-11 rounded-full bg-plum px-6 font-semibold text-gold-soft hover:bg-plum-2 disabled:opacity-50">
          {state.s === "sending" ? t.sending : t.submit}
        </button>
      </div>
      <p aria-live="polite" className="mt-2 text-sm font-semibold text-wine">
        {state.s === "error" ? state.msg : ""}
      </p>
    </form>
  );
}

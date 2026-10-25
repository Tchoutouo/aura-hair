"use client";

import { useState } from "react";
import { getDict, type Lang } from "@/i18n";

export default function ReviewForm({ lang }: { lang: Lang }) {
  const t = getDict(lang).reviews;
  const [form, setForm] = useState({ name: "", city: "", text: "" });
  const [rating, setRating] = useState(5);
  const [status, setStatus] = useState<{ state: "idle" | "sending" | "done" | "error"; msg?: string }>({ state: "idle" });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ state: "sending" });
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, rating, lang }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setStatus({ state: "done" });
      setForm({ name: "", city: "", text: "" });
    } else setStatus({ state: "error", msg: data.error });
  }

  const input = "mt-1 h-11 w-full rounded-lg border border-line bg-white px-3";
  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border-2 border-plum bg-white p-5 md:p-7">
      <h2 className="font-display text-2xl font-bold text-plum">{t.formTitle}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-ink">{t.name} *</span>
          <input required value={form.name} onChange={set("name")} maxLength={60} className={input} />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ink">{t.city} *</span>
          <input required value={form.city} onChange={set("city")} maxLength={60} className={input} />
        </label>
      </div>
      <fieldset>
        <legend className="text-sm font-medium text-ink">{t.rating}</legend>
        <div className="mt-1 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={t.stars(n)}
              aria-pressed={rating === n}
              onClick={() => setRating(n)}
              className={`text-3xl leading-none ${n <= rating ? "text-gold" : "text-line"}`}
            >
              ★
            </button>
          ))}
        </div>
      </fieldset>
      <label className="block text-sm">
        <span className="font-medium text-ink">{t.text} *</span>
        <textarea required rows={4} maxLength={1000} value={form.text} onChange={set("text")} placeholder={t.textHint} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2" />
      </label>
      <button disabled={status.state === "sending"} className="w-full rounded-full bg-plum px-6 py-3 font-semibold text-gold-soft hover:bg-plum-2 disabled:opacity-50">
        {status.state === "sending" ? t.sending : t.submit}
      </button>
      <p aria-live="polite" className={`text-sm font-semibold ${status.state === "error" ? "text-wine" : "text-whatsapp"}`}>
        {status.state === "done" ? t.thanks : status.state === "error" ? status.msg : ""}
      </p>
    </form>
  );
}

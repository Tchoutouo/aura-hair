"use client";

import { useState } from "react";
import { getDict, type Lang } from "@/i18n";
import { fmtFcfa } from "@/lib/pricing";
import { fmtDay } from "@/lib/shipping";
import { STEPS, type Tracking } from "@/lib/tracking";

interface Result {
  id: string;
  createdAt: string;
  items: string[];
  totalFcfa: number;
  tracking: Tracking;
  transitDays: { min: number; max: number };
}

const DAY = 24 * 3600 * 1000;

export default function TrackForm({ lang, initialId }: { lang: Lang; initialId?: string }) {
  const t = getDict(lang).track;
  const [id, setId] = useState(initialId ?? "");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, phone, lang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t.unavailable);
    } finally {
      setBusy(false);
    }
  }

  const input = "mt-1 h-11 w-full rounded-lg border border-line bg-white px-3";
  const reached = result ? STEPS.indexOf(result.tracking.step) : -1;
  const shippedAt = result?.tracking.history.find((h) => h.step === "shipped")?.at;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
      <form onSubmit={submit} className="space-y-4 self-start rounded-2xl border-2 border-plum bg-white p-5 md:p-7">
        <label className="block text-sm">
          <span className="font-medium text-ink">{t.orderId}</span>
          <input required value={id} onChange={(e) => setId(e.target.value)} placeholder="AH-261025-XXXX" autoCapitalize="characters" className={`${input} font-semibold uppercase`} />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ink">{t.phone}</span>
          <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" className={input} />
        </label>
        <button disabled={busy} className="w-full rounded-full bg-plum px-6 py-3 font-semibold text-gold-soft hover:bg-plum-2 disabled:opacity-50">
          {busy ? t.searching : t.submit}
        </button>
        <p aria-live="polite" className="text-sm font-semibold text-wine">{error}</p>
      </form>

      {result && (
        <section aria-live="polite">
          <h2 className="font-display text-2xl font-bold text-plum">{result.id}</h2>
          <p className="mt-1 text-sm text-muted">
            {t.placed(fmtDay(new Date(result.createdAt), lang, false))}, {fmtFcfa(result.totalFcfa)}
          </p>
          <ul className="mt-2 text-sm text-ink">
            {result.items.map((it) => (
              <li key={it}>{it}</li>
            ))}
          </ul>
          {result.tracking.note && (
            <p className="mt-4 rounded-xl bg-gold-soft p-4 text-sm">
              <span className="font-semibold">{t.note} : </span>
              {result.tracking.note}
            </p>
          )}
          <ol className="mt-6 space-y-5 border-l-2 border-line pl-6">
            {STEPS.map((s, i) => {
              const [label, text] = t.steps[s];
              const at = result.tracking.history.find((h) => h.step === s)?.at;
              const state = i < reached ? "done" : i === reached ? "current" : "todo";
              return (
                <li key={s} className="relative" aria-current={state === "current" ? "step" : undefined}>
                  <span
                    className={`absolute -left-[1.95rem] top-0.5 h-4 w-4 rounded-full border-2 ${
                      state === "todo" ? "border-line bg-ivory" : state === "current" ? "border-plum bg-gold" : "border-plum bg-plum"
                    }`}
                  />
                  <p className={`font-semibold ${state === "todo" ? "text-muted" : "text-plum"}`}>
                    {label}
                    {at && state !== "todo" && <span className="ml-2 text-sm font-normal text-muted">{fmtDay(new Date(at), lang, false)}</span>}
                  </p>
                  {state !== "todo" && <p className="text-sm text-muted">{text}</p>}
                  {s === "shipped" && shippedAt && reached < STEPS.indexOf("arrived") && (
                    <p className="mt-1 text-sm font-semibold text-ink">
                      {t.eta(
                        fmtDay(new Date(new Date(shippedAt).getTime() + result.transitDays.min * DAY), lang, false),
                        fmtDay(new Date(new Date(shippedAt).getTime() + result.transitDays.max * DAY), lang, false),
                      )}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}

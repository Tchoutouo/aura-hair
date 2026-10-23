"use client";

import { useState } from "react";
import { getDict, type Lang } from "@/i18n";
import type { Config } from "@/lib/types";

type Subject = "products" | "visa" | "exchange" | "other";
const SUBJECTS: Subject[] = ["products", "visa", "exchange", "other"];

export default function ContactForm({
  lang,
  contacts,
  initialSubject,
}: {
  lang: Lang;
  contacts: Config["contacts"];
  initialSubject?: string;
}) {
  const t = getDict(lang).contact;
  const [subject, setSubject] = useState<Subject>(SUBJECTS.includes(initialSubject as Subject) ? (initialSubject as Subject) : "products");
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" });
  const [contact, setContact] = useState(contacts[0]?.phone ?? "");
  const [status, setStatus] = useState<{ state: "idle" | "sending" | "done" | "error"; msg?: string; link?: string }>({ state: "idle" });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ state: "sending" });
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, subject, contact, lang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setStatus({ state: "done", link: data.whatsapp });
      window.location.href = data.whatsapp;
    } catch (err) {
      setStatus({ state: "error", msg: err instanceof Error ? err.message : "Error" });
    }
  }

  const input = "mt-1 h-11 w-full rounded-lg border border-line bg-white px-3";

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border-2 border-plum bg-white p-5 md:p-7">
      <fieldset>
        <legend className="text-sm font-semibold text-rust">{t.subject}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {SUBJECTS.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={subject === s}
              onClick={() => setSubject(s)}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                subject === s ? "border-plum bg-plum text-gold-soft" : "border-line bg-white text-plum hover:border-plum"
              }`}
            >
              {t.services[s][0]}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="block text-sm">
        <span className="font-medium text-ink">{t.name} *</span>
        <input required value={form.name} onChange={set("name")} autoComplete="name" className={input} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-ink">{t.phone} *</span>
          <input required type="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" className={input} />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ink">{t.email}</span>
          <input type="email" value={form.email} onChange={set("email")} autoComplete="email" className={input} />
        </label>
      </div>
      <label className="block text-sm">
        <span className="font-medium text-ink">{t.message} *</span>
        <textarea
          required
          rows={5}
          value={form.message}
          onChange={set("message")}
          placeholder={t.messageHint}
          className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2"
        />
      </label>
      {contacts.length > 1 && (
        <fieldset className="text-sm">
          <legend className="font-medium text-ink">{getDict(lang).order.sendTo}</legend>
          <div className="mt-1 space-y-1">
            {contacts.map((c) => (
              <label key={c.phone} className="flex items-center gap-2">
                <input type="radio" name="contact" checked={contact === c.phone} onChange={() => setContact(c.phone)} />
                {c.label} : {c.phone}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <button
        type="submit"
        disabled={status.state === "sending"}
        className="w-full rounded-full bg-whatsapp px-6 py-3 font-semibold text-white hover:brightness-110 disabled:opacity-40"
      >
        {status.state === "sending" ? t.sending : t.submit}
      </button>
      <div aria-live="polite">
        {status.state === "done" && status.link && (
          <p className="rounded-lg bg-sand p-3 text-sm">
            {t.done}{" "}
            <a href={status.link} className="font-semibold text-plum underline">
              {t.clickHere}
            </a>
            .
          </p>
        )}
        {status.state === "error" && <p className="text-sm font-semibold text-wine">{status.msg}</p>}
      </div>
    </form>
  );
}

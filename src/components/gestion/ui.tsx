"use client";

import { createContext, useContext, useEffect, useId, useRef } from "react";
import type { Analysis } from "@/lib/gestion/compute";
import type { GestionData, Partner } from "@/lib/gestion/types";
import { fmtFcfa } from "@/lib/pricing";

export type Tab = "bord" | "commandes" | "stock" | "ventes" | "echeances" | "caisse" | "associes";

/** What another tab asked for (e.g. "sell this article"). */
export type Intent = { sellItem?: string; openSale?: string; openOrder?: string } | null;

export interface Ctx {
  data: GestionData;
  a: Analysis;
  keys: Record<string, string>;
  me: Partner;
  /** Runs an action on the server and refreshes the data. Throws the server's message on failure. */
  call: (action: string, payload?: Record<string, unknown>) => Promise<Record<string, unknown>>;
  go: (tab: Tab, intent?: Intent) => void;
  intent: Intent;
  clearIntent: () => void;
}

export const GestionContext = createContext<Ctx | null>(null);
export const useG = () => useContext(GestionContext)!;

export const F = (n: number) => fmtFcfa(n);
/** Signed amount, e.g. "+ 40 000 FCFA". */
export const signed = (n: number) => `${n < 0 ? "− " : "+ "}${fmtFcfa(Math.abs(n))}`;

export const input = "h-10 w-full rounded-lg border border-line bg-white px-3 text-sm";

export function Btn({
  children,
  kind = "primary",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: "primary" | "secondary" | "danger" | "whatsapp" | "link" }) {
  const k = {
    primary: "rounded-full bg-plum px-4 py-2 font-semibold text-gold-soft hover:bg-plum-2",
    secondary: "rounded-full border border-plum bg-white px-4 py-2 font-semibold text-plum hover:bg-sand",
    danger: "rounded-full border border-wine px-4 py-2 font-semibold text-wine hover:bg-wine hover:text-white",
    whatsapp: "rounded-full bg-whatsapp px-4 py-2 font-semibold text-white hover:brightness-110",
    link: "font-semibold text-plum underline underline-offset-2",
  }[kind];
  return (
    <button type="button" className={`text-sm disabled:opacity-40 ${k} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Field({ label, children, hint, className = "" }: { label: string; children: React.ReactNode; hint?: string; className?: string }) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="font-medium text-ink">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${tone === "bad" ? "text-wine" : tone === "good" ? "text-whatsapp" : "text-plum"}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "bad" | "warn" | "plum" }) {
  const t = {
    neutral: "border border-line text-muted",
    good: "bg-whatsapp text-white",
    bad: "bg-wine text-white",
    warn: "bg-gold-soft text-ink",
    plum: "bg-plum text-gold-soft",
  }[tone];
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${t}`}>{children}</span>;
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    panel.current?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-3 sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={id} className={`w-full ${wide ? "max-w-3xl" : "max-w-xl"} rounded-2xl bg-ivory p-5 shadow-xl sm:p-6`}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={id} className="font-display text-2xl font-bold text-plum">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="text-2xl leading-none text-muted hover:text-plum">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Shared submit logic for forms: busy flag and server error message. */
export function FormFooter({ busy, error, label, onCancel, extra }: { busy: boolean; error: string; label: string; onCancel: () => void; extra?: React.ReactNode }) {
  return (
    <div className="mt-5 space-y-2">
      {error && (
        <p role="alert" className="text-sm font-semibold text-wine">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="rounded-full bg-plum px-5 py-2 text-sm font-semibold text-gold-soft hover:bg-plum-2 disabled:opacity-40">
          {busy ? "Enregistrement…" : label}
        </button>
        <Btn kind="secondary" onClick={onCancel}>
          Annuler
        </Btn>
        {extra}
      </div>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">{children}</p>;
}

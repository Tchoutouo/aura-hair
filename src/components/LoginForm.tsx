"use client";

import { useState } from "react";

export default function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) window.location.reload();
    else setError((await res.json().catch(() => ({}))).error || "Erreur");
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-20">
      <h1 className="font-display text-3xl font-bold text-plum">Espace admin</h1>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <label className="block text-sm font-medium">
          Mot de passe
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3"
            required
          />
        </label>
        <button disabled={busy} className="w-full rounded-full bg-plum px-6 py-3 font-semibold text-gold-soft disabled:opacity-50">
          {busy ? "Connexion…" : "Se connecter"}
        </button>
        {error && <p className="text-sm font-semibold text-wine">{error}</p>}
      </form>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

/** Registers the service worker (production only: in dev it would cache stale code). */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((e) => console.error("Service worker", e));
  }, []);
  return null;
}

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * "Install on the phone" button. Android/Chrome: opens the system prompt.
 * iPhone: Safari has no prompt, so it explains Share → Add to Home Screen.
 * Hidden once the app runs installed.
 */
export function InstallButton({ className = "" }: { className?: string }) {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(true);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || (!prompt && !ios)) return null;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={async () => {
          if (prompt) {
            await prompt.prompt();
            const { outcome } = await prompt.userChoice;
            if (outcome === "accepted") setInstalled(true);
            setPrompt(null);
          } else setHelp((h) => !h);
        }}
        aria-expanded={ios ? help : undefined}
        className="rounded-full border border-plum bg-white px-3 py-1.5 text-sm font-semibold text-plum hover:bg-sand"
      >
        Installer sur le téléphone
      </button>
      {help && (
        <p role="status" className="mt-2 max-w-xs rounded-lg bg-gold-soft p-3 text-xs text-ink">
          Dans Safari, touchez le bouton Partager (le carré avec une flèche), puis « Sur l&apos;écran d&apos;accueil ».
        </p>
      )}
    </div>
  );
}

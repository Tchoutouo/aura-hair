import type { Metadata } from "next";
import { display, sans } from "../fonts";
import "../globals.css";

export const metadata: Metadata = { title: "Facture – Aurahair", robots: { index: false, follow: false } };

export default function FactureLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen antialiased print:bg-white">{children}</body>
    </html>
  );
}

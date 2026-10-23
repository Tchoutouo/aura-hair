import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { display, sans } from "../fonts";
import "../globals.css";

export const metadata: Metadata = { title: "Admin – Aurahair", robots: { index: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen antialiased">
        <header className="border-b border-line bg-ivory">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <Image src="/logo.png" alt="Aurahair" width={438} height={257} className="h-10 w-auto mix-blend-multiply" />
            <Link href="/fr" className="text-sm font-medium text-plum underline">Voir le site</Link>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}

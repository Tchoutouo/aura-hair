import type { Metadata, Viewport } from "next";
import Image from "next/image";
import Link from "next/link";
import { PwaRegister } from "@/components/Pwa";
import { display, sans } from "../fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: "Admin – Aurahair",
  robots: { index: false },
  // The management app installs on the partners' phones (manifest linked in <head> below).
  appleWebApp: { capable: true, title: "AH Gestion", statusBarStyle: "default" },
  icons: { apple: "/icons/gestion-apple-180.png" },
};
export const viewport: Viewport = { themeColor: "#3b2230" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${display.variable} ${sans.variable}`}>
      {/* In <head> on purpose: Next can stream metadata into <body>, where Chrome ignores the manifest. */}
      <head>
        <link rel="manifest" href="/gestion.webmanifest" />
      </head>
      <body className="min-h-screen antialiased">
        <header className="border-b border-line bg-ivory">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <Image src="/logo.png" alt="Aurahair" width={438} height={257} className="h-10 w-auto mix-blend-multiply" />
            <Link href="/fr" className="text-sm font-medium text-plum underline">Voir le site</Link>
          </div>
        </header>
        <main>{children}</main>
        <PwaRegister />
      </body>
    </html>
  );
}

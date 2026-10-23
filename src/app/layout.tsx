import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aura Hair – Perruques et mèches naturelles",
  description:
    "Configurez votre perruque, voyez le prix tout compris (transport inclus) et commandez sur WhatsApp. Achat au détail ou en gros.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col antialiased">
        <header className="sticky top-0 z-30 border-b border-line bg-ivory/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" aria-label="Aura Hair – accueil" className="shrink-0">
              <Image src="/logo.png" alt="Aura Hair Extension Co." width={438} height={257} className="h-12 w-auto mix-blend-multiply" priority />
            </Link>
            <nav className="flex flex-wrap items-center justify-end gap-x-5 gap-y-1 text-sm font-medium text-muted">
              <Link href="/textures" className="hover:text-plum">Textures</Link>
              <Link href="/#closures" className="hidden hover:text-plum sm:inline">Closures</Link>
              <Link href="/#comment" className="hidden hover:text-plum sm:inline">Comment ça marche</Link>
              <Link href="/commander" className="rounded-full bg-plum px-4 py-2 text-gold-soft hover:bg-plum-2">
                Calculer mon prix
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="mt-16 border-t-2 border-gold bg-plum text-gold-soft">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
            <div className="space-y-2">
              <p className="font-display text-2xl font-bold tracking-widest">AURA HAIR</p>
              <p className="text-sm text-gold-soft/80">
                Perruques, mèches et closures en cheveux naturels. Achat direct chez nos fournisseurs partenaires.
              </p>
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-semibold tracking-wider">WHATSAPP</p>
              <p><a className="hover:underline" href="https://wa.me/237656464859">Cameroun : +237 656 464 859</a></p>
              <p><a className="hover:underline" href="https://wa.me/237655447247">Cameroun : +237 655 447 247</a></p>
              <p><a className="hover:underline" href="https://wa.me/84858754003">Vietnam : +84 858 754 003</a></p>
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-semibold tracking-wider">LIENS</p>
              <p><Link className="hover:underline" href="/commander?mode=detail">Achat au détail</Link></p>
              <p><Link className="hover:underline" href="/commander?mode=gros">Achat en gros</Link></p>
              <p><Link className="hover:underline" href="/textures">Nos textures</Link></p>
            </div>
          </div>
          <p className="pb-6 text-center text-xs text-gold-soft/60">© {new Date().getFullYear()} Aura Hair Extension Co.</p>
        </footer>
      </body>
    </html>
  );
}

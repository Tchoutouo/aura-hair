import Image from "next/image";
import Link from "next/link";
import { TEXTURES, textureImage } from "@/lib/defaults";
import { fmtFcfa } from "@/lib/pricing";
import { getConfig } from "@/lib/store";
import { CLOSURE_SIZES } from "@/lib/types";

export const dynamic = "force-dynamic";

const featured = ["Body Wave", "Deep Wave", "Kinky Curly", "Loose Wave", "Water Wave", "Pixie Curly", "Bouncy Curly", "Cambodian Wavy"];

export default async function Home() {
  const config = await getConfig();
  return (
    <>
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-12 pb-16 md:grid-cols-2 md:pt-20">
        <div className="space-y-6">
          <p className="text-sm font-semibold tracking-[0.25em] text-rust">CHEVEUX 100 % NATURELS</p>
          <h1 className="font-display text-4xl font-bold leading-tight text-plum md:text-6xl">
            Votre perruque, au juste prix, livrée au Cameroun
          </h1>
          <p className="text-lg text-muted">
            Choisissez la qualité, la longueur, la closure et la couleur : le prix s&apos;affiche tout de suite,
            transport compris. Vous validez, et votre commande détaillée nous arrive sur WhatsApp.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/commander?mode=detail" className="rounded-full bg-plum px-6 py-3 font-semibold text-gold-soft hover:bg-plum-2">
              Je commande au détail
            </Link>
            <Link href="/commander?mode=gros" className="rounded-full border-2 border-plum px-6 py-3 font-semibold text-plum hover:bg-sand">
              J&apos;achète en gros
            </Link>
          </div>
          <p className="text-sm text-muted">
            Transport vers le Cameroun : <strong className="text-plum">{fmtFcfa(config.shippingFcfaPerKg)} par kg</strong>, ajouté
            automatiquement et affiché à part.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {["Body Wave", "Deep Wave", "Loose Wave", "Kinky Curly"].map((t, i) => (
            <div key={t} className={`overflow-hidden rounded-2xl border border-line bg-white ${i % 2 ? "translate-y-6" : ""}`}>
              <Image src={textureImage(t)!} alt={t} width={480} height={480} className="aspect-square w-full object-cover" />
            </div>
          ))}
        </div>
      </section>

      {/* Sourcing promise */}
      <section className="bg-plum text-gold-soft">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="font-display text-3xl font-bold md:text-4xl">Nous achetons pour vous, directement à la source</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              ["Fournisseurs partenaires", "Nos achats se font directement chez les fournisseurs avec qui nous sommes en partenariat. Pas d'intermédiaire."],
              ["Produits vérifiés", "Nous vérifions nous-mêmes chaque produit (qualité, longueur, poids) avant l'envoi."],
              ["Paiement sécurisé", "C'est nous qui payons le fournisseur. Vous ne réglez qu'Aura Hair, jamais un inconnu."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-2xl border border-gold/40 p-6">
                <p className="text-lg font-semibold text-white">{t}</p>
                <p className="mt-2 text-sm leading-relaxed text-gold-soft/85">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="comment" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16">
        <h2 className="font-display text-3xl font-bold text-plum md:text-4xl">Comment ça marche</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            ["Configurez", "Qualité, texture, longueur, closure ou frontal, couleur."],
            ["Voyez le prix", "Prix des produits + transport au poids, en USD et en FCFA."],
            ["Validez", "Votre commande détaillée part sur WhatsApp et par e-mail."],
            ["On s'occupe du reste", "Achat chez le fournisseur, vérification, paiement, envoi."],
          ].map(([t, d], i) => (
            <li key={t} className="rounded-2xl border border-line bg-white p-5">
              <span className="font-display text-3xl font-bold text-gold">{i + 1}</span>
              <p className="mt-2 font-semibold text-plum">{t}</p>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Detail vs Gros */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/commander?mode=detail" className="group rounded-2xl border-2 border-plum bg-white p-7 hover:bg-sand">
            <p className="text-sm font-semibold tracking-widest text-rust">AU DÉTAIL</p>
            <p className="mt-2 font-display text-2xl font-bold text-plum">Une perruque pour vous</p>
            <p className="mt-2 text-muted">On calcule le nombre de paquets selon la longueur et on ajoute la closure de votre choix.</p>
            <p className="mt-4 font-semibold text-plum group-hover:underline">Configurer ma perruque →</p>
          </Link>
          <Link href="/commander?mode=gros" className="group rounded-2xl border-2 border-gold bg-white p-7 hover:bg-sand">
            <p className="text-sm font-semibold tracking-widest text-rust">EN GROS</p>
            <p className="mt-2 font-display text-2xl font-bold text-plum">Revendeuses et salons</p>
            <p className="mt-2 text-muted">Prix grossiste au paquet et à la pièce. Composez votre panier ligne par ligne.</p>
            <p className="mt-4 font-semibold text-plum group-hover:underline">Composer ma commande en gros →</p>
          </Link>
        </div>
      </section>

      {/* Textures preview */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-3xl font-bold text-plum md:text-4xl">Nos textures</h2>
          <Link href="/textures" className="font-semibold text-plum hover:underline">
            Voir les {TEXTURES.length} textures →
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {featured.map((t) => (
            <figure key={t} className="rounded-xl border border-line bg-white p-2">
              <Image src={textureImage(t)!} alt={t} width={480} height={480} className="aspect-square w-full rounded-lg object-cover" />
              <figcaption className="py-2 text-center text-sm font-semibold text-plum">{t}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Closures */}
      <section id="closures" className="mx-auto grid max-w-6xl scroll-mt-24 items-center gap-10 px-4 md:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white p-3">
          <Image src="/closures.jpg" alt="Closures et frontals de différentes tailles" width={714} height={720} className="w-full rounded-xl" />
        </div>
        <div className="space-y-6">
          <h2 className="font-display text-3xl font-bold text-plum md:text-4xl">Closures &amp; frontals</h2>
          <p className="text-muted">
            Le premier chiffre est la largeur de la dentelle, le second sa profondeur, en pouces. Plus la dentelle est
            grande, plus vous êtes libre de faire votre raie et de coiffer.
          </p>
          <div className="flex flex-wrap gap-2">
            {CLOSURE_SIZES.map((s) => (
              <span key={s} className={`rounded-lg px-4 py-2 text-lg font-bold ${s.startsWith("13") ? "bg-gold text-ink" : "bg-plum text-gold-soft"}`}>
                {s}
              </span>
            ))}
          </div>
          <Link href="/commander?mode=detail" className="inline-block rounded-full bg-plum px-6 py-3 font-semibold text-gold-soft hover:bg-plum-2">
            Calculer le prix de ma perruque
          </Link>
        </div>
      </section>
    </>
  );
}

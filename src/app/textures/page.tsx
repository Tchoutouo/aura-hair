import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { TEXTURES, textureImage } from "@/lib/defaults";

export const metadata: Metadata = { title: "Nos textures – Aura Hair" };

export default function TexturesPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <p className="text-sm font-semibold tracking-[0.25em] text-rust">CURLY &amp; WAVY COLLECTION</p>
      <h1 className="mt-2 font-display text-4xl font-bold text-plum md:text-5xl">Nos textures</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Toutes nos mèches existent en Bone Straight et dans les textures ci-dessous. Une texture qui n&apos;est pas dans la
        liste ? Demandez-nous, nous pouvons la faire sur mesure.
      </p>
      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {TEXTURES.filter((t) => textureImage(t)).map((t) => (
          <figure key={t} className="rounded-xl border border-line bg-white p-2">
            <Image src={textureImage(t)!} alt={t} width={480} height={480} className="aspect-square w-full rounded-lg object-cover" />
            <figcaption className="py-2 text-center text-sm font-semibold text-plum">{t}</figcaption>
          </figure>
        ))}
      </div>
      <div className="mt-12 text-center">
        <Link href="/commander" className="inline-block rounded-full bg-plum px-6 py-3 font-semibold text-gold-soft hover:bg-plum-2">
          Calculer mon prix
        </Link>
      </div>
    </section>
  );
}

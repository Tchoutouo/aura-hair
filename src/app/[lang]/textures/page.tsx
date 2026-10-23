import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { asLang, getDict } from "@/i18n";
import { TEXTURES, textureImage } from "@/lib/defaults";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: getDict(asLang((await params).lang)).meta.textures };
}

export default async function TexturesPage({ params }: Props) {
  const lang = asLang((await params).lang);
  const t = getDict(lang).textures;
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold text-plum md:text-5xl">{t.title}</h1>
      <p className="mt-3 max-w-2xl text-muted">{t.lead}</p>
      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {TEXTURES.filter((name) => textureImage(name)).map((name) => (
          <figure key={name} className="rounded-xl border border-line bg-white p-2">
            <Image src={textureImage(name)!} alt={name} width={480} height={480} className="aspect-square w-full rounded-lg object-cover" />
            <figcaption className="py-2 text-center text-sm font-semibold text-plum">{name}</figcaption>
          </figure>
        ))}
      </div>
      <div className="mt-12 text-center">
        <Link href={`/${lang}/commander`} className="inline-block rounded-full bg-plum px-6 py-3 font-semibold text-gold-soft hover:bg-plum-2">
          {t.cta}
        </Link>
      </div>
    </section>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import { asLang, getDict } from "@/i18n";
import LengthGuide3D from "@/components/LengthGuide3D";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: getDict(asLang((await params).lang)).meta.longueurs };
}

export default async function LongueursPage({ params }: Props) {
  const lang = asLang((await params).lang);
  const t = getDict(lang).guide;
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold text-plum md:text-5xl">{t.title}</h1>
      <p className="mt-3 mb-10 max-w-2xl text-lg text-muted">{t.lead}</p>
      <LengthGuide3D lang={lang} />
      <p className="mt-10">
        <Link href={`/${lang}/commander`} className="inline-block rounded-full bg-plum px-6 py-3 font-semibold text-gold-soft hover:bg-plum-2">
          {t.cta}
        </Link>
      </p>
    </div>
  );
}

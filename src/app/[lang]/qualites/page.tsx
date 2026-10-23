import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { asLang, getDict } from "@/i18n";
import { mediaSrc } from "@/lib/media";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: getDict(asLang((await params).lang)).meta.qualites };
}

export default async function QualitesPage({ params }: Props) {
  const lang = asLang((await params).lang);
  const d = getDict(lang);
  const t = d.qualites;
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="grid items-start gap-10 md:grid-cols-[1.4fr_1fr]">
        <div>
          <h1 className="font-display text-4xl font-bold text-plum md:text-5xl">{t.title}</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">{t.lead}</p>
          <div className="mt-8 rounded-2xl bg-plum p-6 text-gold-soft">
            <h2 className="font-display text-2xl font-bold text-white">{t.origin.title}</h2>
            <p className="mt-2 leading-relaxed">{t.origin.text}</p>
          </div>
        </div>
        <figure>
          <Image
            src={mediaSrc("deep-wave-bordeaux", "jpg")}
            alt={d.media["deep-wave-bordeaux"]}
            width={499}
            height={610}
            priority
            className="w-full rounded-2xl object-cover"
          />
          <figcaption className="mt-2 text-sm text-muted">{d.media["deep-wave-bordeaux"]}</figcaption>
        </figure>
      </div>

      {t.groups.map((g) => (
        <section key={g.title} className="mt-14">
          <h2 className="font-display text-3xl font-bold text-plum">{g.title}</h2>
          <dl className="mt-6 grid gap-x-10 gap-y-8 md:grid-cols-2">
            {g.items.map((it) => (
              <div key={it.name} className="border-l-4 border-gold pl-5">
                <dt className="font-display text-xl font-bold text-plum">{it.name}</dt>
                <dd className="mt-2 max-w-prose leading-relaxed text-ink">{it.text}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      <section className="mt-14 rounded-2xl bg-sand p-7 md:p-10">
        <h2 className="font-display text-2xl font-bold text-plum">{t.sellTitle}</h2>
        <p className="mt-2 max-w-2xl text-muted">{t.sellText}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/${lang}/commander`} className="rounded-full bg-plum px-6 py-3 font-semibold text-gold-soft hover:bg-plum-2">
            {t.ctaPrice}
          </Link>
          <Link href={`/${lang}/contact?sujet=other`} className="rounded-full border-2 border-plum px-6 py-3 font-semibold text-plum hover:bg-white">
            {t.ctaAsk}
          </Link>
        </div>
      </section>
    </div>
  );
}

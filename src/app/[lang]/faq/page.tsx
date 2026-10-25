import Link from "next/link";
import type { Metadata } from "next";
import { asLang, getDict } from "@/i18n";
import { fmtDay, nextShipment } from "@/lib/shipping";
import { getConfig } from "@/lib/store";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: getDict(asLang((await params).lang)).meta.faq };
}

export default async function FaqPage({ params }: Props) {
  const lang = asLang((await params).lang);
  const d = getDict(lang);
  const config = await getConfig();
  const { ship, arriveFrom, arriveTo } = nextShipment(config);
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold text-plum md:text-5xl">{d.faq.title}</h1>
      <p className="mt-3 text-lg text-muted">{d.faq.lead}</p>
      <p className="mt-6 rounded-xl bg-gold-soft p-4 text-sm">
        {d.ship.banner(fmtDay(ship, lang), fmtDay(arriveFrom, lang, false), fmtDay(arriveTo, lang, false))}
      </p>
      <div className="mt-8 divide-y divide-line border-y border-line">
        {d.faq.items.map(([q, a]) => (
          <details key={q} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-plum">
              {q}
              <span aria-hidden="true" className="text-2xl leading-none text-gold transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 max-w-prose leading-relaxed text-ink">{a}</p>
          </details>
        ))}
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href={`/${lang}/suivi`} className="rounded-full bg-plum px-6 py-3 font-semibold text-gold-soft hover:bg-plum-2">
          {d.track.link}
        </Link>
        <Link href={`/${lang}/contact`} className="rounded-full border-2 border-plum px-6 py-3 font-semibold text-plum hover:bg-sand">
          {d.home.servicesCta}
        </Link>
      </div>
    </div>
  );
}

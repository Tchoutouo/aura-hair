import Link from "next/link";
import type { Metadata } from "next";
import { asLang, getDict } from "@/i18n";
import { availableWigs } from "@/lib/gestion/available";
import AvailableGrid from "@/components/AvailableGrid";
import WaitlistForm from "@/components/WaitlistForm";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: getDict(asLang((await params).lang)).meta.dispo };
}

export default async function DisponiblesPage({ params }: Props) {
  const lang = asLang((await params).lang);
  const t = getDict(lang).dispo;
  const wigs = await availableWigs().catch(() => []);
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold text-plum md:text-5xl">{t.title}</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">{t.lead}</p>
      <div className="mt-10">{wigs.length ? <AvailableGrid lang={lang} wigs={wigs} /> : <p className="rounded-xl border border-dashed border-line p-6 text-center text-muted">{t.empty}</p>}</div>
      <p className="mt-8">
        <Link href={`/${lang}/commander`} className="font-semibold text-plum underline underline-offset-4">
          {t.custom}
        </Link>
      </p>
      <div className="mt-12">
        <WaitlistForm lang={lang} />
      </div>
    </div>
  );
}

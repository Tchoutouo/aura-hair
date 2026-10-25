import type { Metadata } from "next";
import { asLang, getDict } from "@/i18n";
import TrackForm from "@/components/TrackForm";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<{ n?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: getDict(asLang((await params).lang)).meta.suivi };
}

export default async function SuiviPage({ params, searchParams }: Props) {
  const lang = asLang((await params).lang);
  const { n } = await searchParams;
  const t = getDict(lang).track;
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold text-plum md:text-5xl">{t.title}</h1>
      <p className="mt-3 mb-10 max-w-2xl text-lg text-muted">{t.lead}</p>
      <TrackForm lang={lang} initialId={n?.slice(0, 30)} />
    </div>
  );
}

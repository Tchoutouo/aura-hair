import type { Metadata } from "next";
import { asLang, getDict } from "@/i18n";
import { listReviews } from "@/lib/store";
import ReviewForm from "@/components/ReviewForm";
import ReviewList from "@/components/ReviewList";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: getDict(asLang((await params).lang)).meta.avis };
}

export default async function AvisPage({ params }: Props) {
  const lang = asLang((await params).lang);
  const t = getDict(lang).reviews;
  const reviews = (await listReviews()).filter((r) => r.status === "approved");
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold text-plum md:text-5xl">{t.title}</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">{t.lead}</p>
      <div className="mt-10">{reviews.length ? <ReviewList lang={lang} reviews={reviews} /> : <p className="text-muted">{t.empty}</p>}</div>
      <div className="mt-14 max-w-2xl">
        <ReviewForm lang={lang} />
      </div>
    </div>
  );
}

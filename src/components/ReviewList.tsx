import { getDict, type Lang } from "@/i18n";
import type { Review } from "@/lib/store";

export default function ReviewList({ lang, reviews }: { lang: Lang; reviews: Review[] }) {
  const t = getDict(lang).reviews;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {reviews.map((r) => (
        <figure key={r.id} className="flex flex-col rounded-2xl border border-line bg-white p-5">
          <p className="text-lg tracking-wider text-gold" role="img" aria-label={t.stars(r.rating)}>
            {"★".repeat(r.rating)}
            <span className="text-line">{"★".repeat(5 - r.rating)}</span>
          </p>
          <blockquote className="mt-3 flex-1 leading-relaxed text-ink">{r.text}</blockquote>
          <figcaption className="mt-4 text-sm font-semibold text-plum">
            {r.name}, {r.city}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

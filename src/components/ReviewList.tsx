import Image from "next/image";
import { getDict, type Lang } from "@/i18n";
import type { Review } from "@/lib/store";

export default function ReviewList({ lang, reviews }: { lang: Lang; reviews: Review[] }) {
  const t = getDict(lang).reviews;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {reviews.map((r) => (
        <figure key={r.id} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
          {r.photo && (
            <Image src={r.photo} alt={t.photoAlt(r.name)} width={600} height={600} sizes="(min-width: 768px) 33vw, 100vw" className="aspect-square w-full object-cover" />
          )}
          <div className="flex flex-1 flex-col p-5">
          <p className="text-lg tracking-wider text-gold" role="img" aria-label={t.stars(r.rating)}>
            {"★".repeat(r.rating)}
            <span className="text-line">{"★".repeat(5 - r.rating)}</span>
          </p>
          <blockquote className="mt-3 flex-1 leading-relaxed text-ink">{r.text}</blockquote>
          <figcaption className="mt-4 text-sm font-semibold text-plum">
            {r.name}, {r.city}
          </figcaption>
          </div>
        </figure>
      ))}
    </div>
  );
}

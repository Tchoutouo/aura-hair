import Image from "next/image";
import type { Metadata } from "next";
import { asLang, getDict } from "@/i18n";
import { mediaSrc, PHOTOS, VIDEOS } from "@/lib/media";
import VideoCard from "@/components/VideoCard";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: getDict(asLang((await params).lang)).meta.galerie };
}

export default async function GaleriePage({ params }: Props) {
  const d = getDict(asLang((await params).lang));
  const t = d.galerie;
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold text-plum md:text-5xl">{t.title}</h1>
      <p className="mt-3 max-w-2xl text-muted">{t.lead}</p>

      <h2 className="mt-12 font-display text-2xl font-bold text-plum">{t.videos}</h2>
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {VIDEOS.map((v) => (
          <VideoCard key={v.id} item={v} caption={d.media[v.id]} />
        ))}
      </div>

      <h2 className="mt-14 font-display text-2xl font-bold text-plum">{t.photos}</h2>
      <div className="mt-6 columns-2 gap-4 md:columns-3">
        {PHOTOS.map((p) => (
          <figure key={p.id} className="mb-4 break-inside-avoid">
            <Image
              src={mediaSrc(p.id, "jpg")}
              alt={d.media[p.id]}
              width={p.w}
              height={p.h}
              sizes="(min-width: 768px) 33vw, 50vw"
              className="w-full rounded-xl"
            />
            <figcaption className="mt-1 text-sm text-muted">{d.media[p.id]}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
